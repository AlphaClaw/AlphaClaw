---
summary: "CLI reference for `alphaclaw reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `alphaclaw reset`

Reset local config/state (keeps the CLI installed).

```bash
alphaclaw reset
alphaclaw reset --dry-run
alphaclaw reset --scope config+creds+sessions --yes --non-interactive
```
