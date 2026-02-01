# OpenClaw Memory System Analysis

A deep reverse-engineering of why OpenClaw's memory capabilities work so well and why users rave about it.

---

## Executive Summary

OpenClaw's memory system succeeds because it is **transparent** (users see what's stored), **reliable** (hybrid search + pre-compaction flush ensures persistence), and **effortless** (zero-config defaults). It solves the fundamental LLM memory problem — context windows are finite — with an elegant solution that users can trust and understand.

---

## 1. Markdown-as-Source-of-Truth Philosophy

**Key insight**: Memory lives in plain `.md` files, not a black-box database.

```
workspace/
├── MEMORY.md           # Long-term curated memory
└── memory/
    └── YYYY-MM-DD.md   # Daily append-only logs
```

### Why this works:
- **Human-readable**: Users can inspect, edit, and version-control their bot's memory
- **Portable**: No vendor lock-in; memory moves with the user
- **Debuggable**: When the bot "forgets," users can see exactly what's stored
- **Transparent**: Trust comes from transparency — users see the bot actually writes things down

This is a significant UX advantage over opaque vector stores that users can't inspect.

---

## 2. Hybrid Search (Vector + BM25)

The system combines two complementary retrieval signals:

```typescript
const score = vectorWeight * vectorScore + textWeight * textScore;
// Default: 70% vector, 30% keyword
```

### Why this works:
- **Vector search** handles semantic similarity ("the gateway machine" = "Mac Studio running OpenClaw")
- **BM25 keyword search** handles exact matches (commit hashes, env vars, error strings)
- **Real-world queries need both**: "What was that error with sqlite-vec?" needs exact match on `sqlite-vec` + semantic match on "error"

The merge algorithm unions candidates by chunk ID and applies weighted scoring. This pragmatic approach beats pure vector search for real note retrieval.

### Merge Algorithm:

1. Retrieve candidate pool from both sides:
   - **Vector**: top `maxResults * candidateMultiplier` by cosine similarity
   - **BM25**: top `maxResults * candidateMultiplier` by FTS5 BM25 rank

2. Convert BM25 rank into a 0..1 score:
   - `textScore = 1 / (1 + max(0, bm25Rank))`

3. Union candidates by chunk id and compute weighted score:
   - `finalScore = vectorWeight * vectorScore + textWeight * textScore`

---

## 3. Pre-Compaction Memory Flush (The "Save Before Compact" Pattern)

This is a clever innovation that triggers a silent agentic turn before context compaction:

```typescript
// Trigger condition: session approaching context window limit
const threshold = contextWindow - reserveTokensFloor - softThresholdTokens;
if (totalTokens >= threshold && !alreadyFlushedThisCycle) {
  // Silent agentic turn to write memories before compaction
}
```

### Why this works:
- **Automatic memory persistence**: The bot is reminded to save important info before losing context
- **Silent by default**: Uses `NO_REPLY` so users don't see the flush turn
- **Once per compaction cycle**: Tracked via `memoryFlushCompactionCount` to avoid spam
- **Respects sandbox**: Only runs when workspace is writable

This solves a fundamental problem: LLMs lose context during compaction, but this ensures important facts get persisted first.

### Default Configuration:
```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

---

## 4. Smart Chunking Strategy

```typescript
const maxChars = chunking.tokens * 4;  // ~400 tokens default
const overlapChars = chunking.overlap * 4;  // ~80 tokens overlap
```

### Why this works:
- **Preserves context**: 80-token overlap means chunks share boundary content
- **Line-aware**: Chunks track `startLine` and `endLine` for precise retrieval
- **Hash-based change detection**: SHA256 hashes avoid re-embedding unchanged content
- **Long-line handling**: Splits lines exceeding max chars into segments

---

## 5. Multi-Provider Embedding with Graceful Fallback

```typescript
// Auto-selection waterfall:
// 1. local (if model file exists on disk)
// 2. openai (if API key available)
// 3. gemini (if API key available)
// 4. error with helpful message
```

### Why this works:
- **Zero-config**: Just works with whatever credentials are available
- **Privacy option**: Local embeddings via `node-llama-cpp` for sensitive data
- **Cost efficiency**: Batch API support for OpenAI/Gemini reduces costs
- **Resilience**: Automatic fallback with recorded reason

### Local Embedding Auto-Download:
- Default local model: `hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf` (~0.6 GB)
- When `memorySearch.provider = "local"`, node-llama-cpp auto-downloads missing GGUF files
- Fallback to remote embeddings if local setup fails

---

## 6. Embedding Cache

```typescript
const EMBEDDING_CACHE_TABLE = "embedding_cache";
// Key: (provider, model, provider_key, hash)
// Avoids re-embedding unchanged chunks
```

### Why this works:
- **Fast reindexing**: Only new/changed chunks get embedded
- **Cost savings**: No wasted API calls for unchanged content
- **Provider-aware**: Cache invalidates when switching providers/models

### Configuration:
```json5
{
  agents: {
    defaults: {
      memorySearch: {
        cache: {
          enabled: true,
          maxEntries: 50000
        }
      }
    }
  }
}
```

---

## 7. Debounced File Watching

```typescript
const SESSION_DIRTY_DEBOUNCE_MS = 5000;
const watchDebounceMs = 1500;  // Default for memory files
```

### Why this works:
- **Responsive but not thrashing**: Changes trigger sync after short delay
- **Batch updates**: Multiple rapid edits get batched into one sync
- **Session delta thresholds**: Only reindex sessions after significant changes (100KB or 50 messages)

---

## 8. Tool Design: Search + Get Pattern

Two complementary tools:

### `memory_search`
- Returns snippets with scores, paths, line ranges
- Semantic search over all memory files
- Includes provider/model metadata in response

### `memory_get`
- Fetches specific lines from a memory file
- Security-restricted to allowed paths only
- Supports line range parameters

### Why this works:
- **Context-efficient**: Search returns snippets (700 chars max), not full files
- **Progressive disclosure**: Agent searches → identifies relevant files → fetches specific lines
- **Security**: `memory_get` only allows paths in `MEMORY.md`, `memory/`, or explicit `extraPaths`

The tool description is key — it's a **"Mandatory recall step"** that explicitly tells the model when to use it:

```typescript
description: "Mandatory recall step: semantically search MEMORY.md + memory/*.md (and optional session transcripts) before answering questions about prior work, decisions, dates, people, preferences, or todos"
```

---

## 9. Session Memory (Experimental)

```typescript
// Extracts user/assistant messages from JSONL transcripts
// Normalizes whitespace, creates searchable text
collected.push(`${label}: ${text}`);  // "User: ..." or "Assistant: ..."
```

### Why this works:
- **Conversation history becomes searchable**: "What did we discuss about X?"
- **Delta-based sync**: Only indexes new portions of sessions
- **Isolated per agent**: Privacy boundaries respected

### Configuration:
```json5
{
  agents: {
    defaults: {
      memorySearch: {
        experimental: { sessionMemory: true },
        sources: ["memory", "sessions"]
      }
    }
  }
}
```

### Delta Thresholds:
```json5
{
  sync: {
    sessions: {
      deltaBytes: 100000,   // ~100 KB
      deltaMessages: 50     // JSONL lines
    }
  }
}
```

---

## 10. Architecture Decisions That Matter

| Decision | Benefit |
|----------|---------|
| **SQLite for everything** | Single-file database, no external services |
| **sqlite-vec acceleration** | Native vector ops when available, JS fallback otherwise |
| **FTS5 for BM25** | Leverages SQLite's built-in full-text search |
| **Per-agent isolation** | Each agent has its own memory index at `~/.openclaw/memory/<agentId>.sqlite` |
| **Configurable defaults** | Works out-of-box, tunable for power users |

---

## Memory System File Structure

```
src/memory/
├── manager.ts              # Core MemoryIndexManager (76KB)
├── embeddings.ts           # Provider abstraction
├── embeddings-openai.ts    # OpenAI embeddings
├── embeddings-gemini.ts    # Gemini embeddings
├── batch-openai.ts         # OpenAI batch API
├── batch-gemini.ts         # Gemini batch API
├── internal.ts             # File discovery, chunking
├── session-files.ts        # Session transcript handling
├── manager-search.ts       # Vector + BM25 search
├── hybrid.ts               # Result merging
├── memory-schema.ts        # SQLite schema
├── sync-memory-files.ts    # Markdown file indexing
├── sync-session-files.ts   # Session file indexing
└── sqlite-vec.ts           # sqlite-vec extension
```

---

## Data Flow: Search Operation

1. **User Query** → Agent receives message
2. **Tool Injection** → `memory_search` tool added to system prompt
3. **Agent Calls Tool** → Passes query string
4. **Manager.search()** →
   - Warm session index if needed
   - Trigger sync if dirty
   - Run hybrid search (vector + BM25)
   - Filter by score threshold
   - Return top N results
5. **Agent Processes Results** → Uses snippets + `memory_get` for detailed reads
6. **Memory Persistence** → Session transcript updated to JSONL

---

## Summary: Why People Rave About This

| Feature | User Experience Impact |
|---------|----------------------|
| Markdown files | "I can see and edit my bot's memory" |
| Hybrid search | "It finds things even when I phrase them differently" |
| Pre-compaction flush | "It remembers things even after long conversations" |
| Automatic indexing | "It just works, I didn't configure anything" |
| Tool prompting | "It actually uses memory when I ask about past things" |
| Local embedding option | "My data stays on my machine" |

---

## Full Configuration Reference

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        enabled: true,
        provider: "auto",  // "auto" | "openai" | "gemini" | "local"
        model: "text-embedding-3-small",
        fallback: "none",  // "openai" | "gemini" | "local" | "none"
        sources: ["memory"],  // or ["memory", "sessions"]
        extraPaths: [],
        local: {
          modelPath: "hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf",
          modelCacheDir: null
        },
        remote: {
          baseUrl: null,
          apiKey: null,
          headers: {},
          batch: {
            enabled: true,
            wait: true,
            concurrency: 2,
            pollIntervalMs: 5000,
            timeoutMinutes: 30
          }
        },
        store: {
          path: "~/.openclaw/memory/{agentId}.sqlite",
          vector: { enabled: true, extensionPath: null }
        },
        chunking: { tokens: 400, overlap: 80 },
        sync: {
          onSessionStart: true,
          onSearch: true,
          watch: true,
          watchDebounceMs: 1500,
          intervalMinutes: 0,
          sessions: { deltaBytes: 100000, deltaMessages: 50 }
        },
        query: {
          maxResults: 6,
          minScore: 0.35,
          hybrid: {
            enabled: true,
            vectorWeight: 0.7,
            textWeight: 0.3,
            candidateMultiplier: 4
          }
        },
        cache: { enabled: true, maxEntries: 50000 }
      }
    }
  }
}
```

---

*Analysis generated from OpenClaw codebase review*
