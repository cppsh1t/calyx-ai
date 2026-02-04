# Draft: skill-migrator

## Requirements (confirmed)

**User's Goal**: Create a skill that uses symlinks to migrate skills from `.agents/skills/` to `.opencode/skills/`

**Confirmed Requirements**:

1. **Migration Type**: Create Symlinks (not copies)
   - `.opencode/skills/*` will be symlinks pointing to `.agents/skills/*`
   - Changes in `.agents` reflect automatically in `.opencode`

2. **Trigger Scenarios**: Both Options
   - Manual invocation: User explicitly calls the skill
   - Automatic hooks: After skill-creator creates a new skill

3. **Operation Scope**: Single Skill
   - Migrate one skill at a time
   - User specifies which skill to migrate

## Technical Decisions

**Skill Name**: `skill-migrator`

- Short, clear, verb-led
- Describes the action (migrate skills)
- Fits naming conventions (lowercase, hyphens)

**Skill Type**: Automation skill with bundled Python scripts

- Similar pattern to skill-creator
- Script: `migrate_skill.py` - Creates symlink for a single skill

**Platform Considerations**:

- Windows support: Use `os.symlink()` with proper error handling
- Check if symlink already exists
- Validate source skill exists before creating symlink

## Use Cases

### Use Case 1: Manual Invocation

User says:

- "Migrate skill-creator to .opencode"
- "Sync the new skill to .opencode"
- "链接 skill-creator 到 opencode"

### Use Case 2: Post-Create Hook

After running `init_skill.py` to create a new skill, automatically call migrator to create symlink.

### Use Case 3: Manual Download

User manually downloads a `.skill` file and extracts it to `.agents/skills/`, then needs to create symlink in `.opencode/skills/`.

## Implementation Plan

### Script: `migrate_skill.py`

```python
#!/usr/bin/env python3
"""
Migrate a skill from .agents/skills/ to .opencode/skills/ using symlinks.

Usage:
    migrate_skill.py <skill-name>

Example:
    migrate_skill.py skill-creator
"""

import sys
from pathlib import Path

def migrate_skill(skill_name):
    # Source: .agents/skills/<skill-name>
    # Target: .opencode/skills/<skill-name>
    # Create symlink
    # Handle errors (already exists, source missing, etc.)
```

### Integration with skill-creator

Modify `init_skill.py` to add optional `--migrate` flag:

```bash
init_skill.py my-skill --path .agents/skills --migrate
```

This would:

1. Create skill in `.agents/skills/my-skill/`
2. Automatically call `migrate_skill.py` to create symlink in `.opencode/skills/my-skill/`

## SKILL.md Structure

```markdown
# Skill Migrator

## Overview

Creates symlinks from .agents/skills/ to .opencode/skills/ for automatic sync.

## When to Use

- After skill-creator generates a skill in .agents
- After manually downloading a skill to .agents
- Need to keep .opencode in sync with .agents

## Usage

Manual: `bun run .agents/skills/skill-migrator/scripts/migrate_skill.py skill-name`
Auto: Add `--migrate` flag to init_skill.py

## Script Reference

### migrate_skill.py

Creates a symlink for a single skill.
```

## Open Questions

1. **Should the skill support batch operations?**
   - User chose "Single Skill" scope, but batch could be useful
   - Keep it simple for now (single skill), can extend later

2. **Should we validate symlinks on migration?**
   - Check if existing symlink points to correct source
   - Warn if symlink is broken

3. **How to handle Windows symlink permissions?**
   - Windows requires developer mode or admin privileges for symlinks
   - Provide helpful error message if symlink creation fails

## Scope Boundaries

### INCLUDE:

- Creating symlinks from .agents/skills/ to .opencode/skills/
- Validation (source exists, target doesn't already exist)
- Error handling with clear messages
- Documentation for manual and automatic usage

### EXCLUDE:

- Batch operations (single skill only, per user choice)
- Syncing content (symlinks handle this automatically)
- Validation of skill structure (skill-creator already does this)
- Removing/migrating back (cleanup is out of scope)
