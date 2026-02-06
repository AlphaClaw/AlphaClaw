---
summary: "CLI reference for `alphaclaw config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `alphaclaw config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `alphaclaw configure`).

## Examples

```bash
alphaclaw config get browser.executablePath
alphaclaw config set browser.executablePath "/usr/bin/google-chrome"
alphaclaw config set agents.defaults.heartbeat.every "2h"
alphaclaw config set agents.list[0].tools.exec.node "node-id-or-name"
alphaclaw config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
alphaclaw config get agents.defaults.workspace
alphaclaw config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
alphaclaw config get agents.list
alphaclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
alphaclaw config set agents.defaults.heartbeat.every "0m"
alphaclaw config set gateway.port 19001 --json
alphaclaw config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
