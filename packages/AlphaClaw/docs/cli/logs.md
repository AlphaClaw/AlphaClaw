---
summary: "CLI reference for `alphaclaw logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `alphaclaw logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
alphaclaw logs
alphaclaw logs --follow
alphaclaw logs --json
alphaclaw logs --limit 500
```
