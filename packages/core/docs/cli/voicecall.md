---
summary: "CLI reference for `alphaclaw voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `alphaclaw voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
alphaclaw voicecall status --call-id <id>
alphaclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
alphaclaw voicecall continue --call-id <id> --message "Any questions?"
alphaclaw voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
alphaclaw voicecall expose --mode serve
alphaclaw voicecall expose --mode funnel
alphaclaw voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
