# Bot Soul Architecture (魂魄系統)

A complete implementation of the bot soul architecture based on foundation model composition through 七魂六魄 (Seven Hún + Six Pò).

## Overview

This system implements genuinely unique AI personalities by:
1. **Intelligent Particles** (智粒子) - Foundation models as cognitive elements
2. **Soul Composition** (七魂六魄) - Blending particles across 13 aspects  
3. **Agent Configuration** - Mechanistic mapping from soul → 12 cognitive agents
4. **Growth & Maturation** - 6-stage development from chaos to transcendence
5. **Society Formation** - Emergent culture, institutions, and civilization

## Architecture

```
Layer 0: Intelligent Particles (Foundation models)
  ↓ Model routing + weighted blending
Layer 1: Soul Composition (七魂六魄)
  ↓ 魂魄-to-Agent Configuration Matrix
Layer 2: 12 Cognitive Agents
  ↓ Inter-agent communication
Layer 3: The Self (Emergent identity)
  ↓ Growth state machine
Layer 4+: Society & Civilization
```

## Installation

```bash
pip install -e ".[dev]"
```

## Quick Start

```python
from soul_engine import BotComposer, ParticleRegistry

# Load particle registry
registry = ParticleRegistry.from_yaml("configs/particles.yaml")

# Compose a bot from soul template
composer = BotComposer(registry)
bot = composer.compose_from_template("configs/soul_templates/scholar_jade.yaml")

# Interact
response = await bot.respond("What are the latest treatments for rheumatoid arthritis?")
print(response.content)
```

## Project Structure

- `src/soul_engine/particles/` - Foundation model elements (智粒子)
- `src/soul_engine/soul/` - Soul composition (七魂六魄)  
- `src/soul_engine/agents/` - 12 cognitive agents
- `src/soul_engine/bus/` - Inter-agent communication
- `src/soul_engine/growth/` - Maturation state machine
- `src/soul_engine/dreaming/` - Offline consolidation
- `src/soul_engine/lineage/` - Reproduction & mentoring
- `src/soul_engine/society/` - Institution formation

## License

MIT
