---
description: List available wizard commands
---

# Wizard Commands

Show available wizard commands to the user.

## Instructions

Display this help information:

---

## Wizard Commands (`/wiz:*`)

Summon domain-expert wizards for interactive sessions. Each wizard primes the agent with deep knowledge before you ask questions.

| Command | Domain | Description |
|---------|--------|-------------|
| `/wiz:core [output-file]` | Architecture | Clawdbot product internals: gateway, agents, providers, data flow |
| `/wiz:workflow [output-file]` | Dev Process | Development workflow, hotfixes, releases, project management |
| `/wiz:help` | - | This help |

## Usage

```bash
# Prime for architecture questions (no output)
/wiz:core

# Prime and display report on screen
/wiz:core stdout

# Prime and save report to file
/wiz:core /tmp/architecture-report.txt

# Prime for workflow/project questions
/wiz:workflow
```

## How It Works

1. Agent explores relevant files and documentation
2. Builds internal understanding of the domain
3. Generates comprehensive report
4. Writes report to specified destination:
   - Default (no argument or `/dev/null`): Silent, just confirms primed
   - `stdout`: Displays report on screen
   - File path: Saves report to file
5. Ready for interactive Q&A session

## Examples

```
> /wiz:core
Primed for Clawdbot architecture questions.

> How does message routing work?
[Agent answers with specific file references from exploration]

> /wiz:workflow stdout
Dev Workflow Primed
===================
[Full summary shown]
...

> /wiz:core /tmp/arch.txt
Report written to /tmp/arch.txt. Primed for Clawdbot architecture questions.
```

---
