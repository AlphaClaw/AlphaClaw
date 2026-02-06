---
summary: "CLI reference for `alphaclaw agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `alphaclaw agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
alphaclaw agents list
alphaclaw agents add work --workspace ~/.alphaclaw/workspace-work
alphaclaw agents set-identity --workspace ~/.alphaclaw/workspace --from-identity
alphaclaw agents set-identity --agent main --avatar avatars/alphaclaw.png
alphaclaw agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.alphaclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
alphaclaw agents set-identity --workspace ~/.alphaclaw/workspace --from-identity
```

Override fields explicitly:

```bash
alphaclaw agents set-identity --agent main --name "AlphaClaw" --emoji "🦞" --avatar avatars/alphaclaw.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "AlphaClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/alphaclaw.png",
        },
      },
    ],
  },
}
```
