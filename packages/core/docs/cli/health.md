---
summary: "CLI reference for `alphaclaw health` (gateway health endpoint via RPC)"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `alphaclaw health`

Fetch health from the running Gateway.

```bash
alphaclaw health
alphaclaw health --json
alphaclaw health --verbose
```

Notes:

- `--verbose` runs live probes and prints per-account timings when multiple accounts are configured.
- Output includes per-agent session stores when multiple agents are configured.
