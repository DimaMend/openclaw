# pi-ai Web Search Implementation Guide

## Overview

Add native web search support to `@mariozechner/pi-ai` for Anthropic (and later OpenAI, xAI, Google).

## Files to Modify

### 1. `src/types.ts` — Add WebSearch types

```typescript
export interface WebSearchConfig {
  enabled?: boolean;
  maxUses?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  userLocation?: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
  };
}

export interface StreamOptions {
  // ... existing
  webSearch?: WebSearchConfig;
}
```

### 2. `src/providers/anthropic.ts` — Inject tool + handle response

#### In `buildParams()`:

```typescript
// After existing tool handling, before return
if (options?.webSearch?.enabled) {
  const webSearchTool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
  };
  if (options.webSearch.maxUses) {
    webSearchTool.max_uses = options.webSearch.maxUses;
  }
  if (options.webSearch.allowedDomains?.length) {
    webSearchTool.allowed_domains = options.webSearch.allowedDomains;
  }
  if (options.webSearch.blockedDomains?.length) {
    webSearchTool.blocked_domains = options.webSearch.blockedDomains;
  }
  if (options.webSearch.userLocation) {
    webSearchTool.user_location = {
      type: "approximate",
      ...options.webSearch.userLocation,
    };
  }
  params.tools = [...(params.tools || []), webSearchTool];
}
```

#### In `streamAnthropic()` content_block_start handler:

```typescript
} else if (event.content_block.type === "server_tool_use") {
  // Claude is invoking web search
  const block: Block = {
    type: "serverToolUse",
    id: event.content_block.id,
    name: event.content_block.name,
    input: {},
    index: event.index,
  };
  output.content.push(block);
  stream.push({ type: "server_tool_use_start", contentIndex: output.content.length - 1, partial: output });
}
```

#### Handle `web_search_tool_result` block:

```typescript
} else if (event.content_block.type === "web_search_tool_result") {
  // Search results returned by Anthropic
  const block: Block = {
    type: "webSearchResult",
    toolUseId: event.content_block.tool_use_id,
    content: event.content_block.content,
    index: event.index,
  };
  output.content.push(block);
}
```

### 3. New content types to export

```typescript
export interface ServerToolUse {
  type: "serverToolUse";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface WebSearchResult {
  type: "webSearchResult";
  toolUseId: string;
  content: Array<{
    type: "web_search_result";
    url: string;
    title: string;
    encrypted_content: string;
    page_age?: string;
  }>;
}

export interface Citation {
  type: "citation";
  url: string;
  title: string;
  citedText: string;
  startIndex: number;
  endIndex: number;
}
```

## Testing

```typescript
const response = await streamSimple(model, context, {
  webSearch: {
    enabled: true,
    maxUses: 3,
    userLocation: { country: "US" },
  },
});
```

## References

- [Anthropic Web Search Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- Related issue: clawdbot/clawdbot#877
- Upstream issue: badlogic/pi-mono#709
