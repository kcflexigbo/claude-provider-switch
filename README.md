# claude-provider-switch

Run Claude Code against **any Anthropic-compatible endpoint** — Volcengine Ark, DeepSeek, or your own gateway — with isolated per-session profiles.

Each profile is passed to Claude Code via `--settings`, which outranks `~/.claude/settings.json` and applies to **one process only**. Switching never touches a session running in another terminal.

```
cc-setup          # configure a provider (asks for your API key)
cc-run ark        # launch Claude Code on Ark
cc-run deepseek   # launch on DeepSeek
cc-list           # what's configured
cc-which          # what a bare `claude` would use
```

## Install

Requires Node.js 18+ and Claude Code (`npm i -g @anthropic-ai/claude-code`).

**macOS / Linux / Windows** — same command:

```bash
npm install -g github:kcflexigbo/claude-provider-switch
```

That gives you `cc-setup`, `cc-run`, `cc-list`, `cc-which` on your PATH. On Windows, npm generates the `.cmd` shims automatically — no admin rights, no WSL.

Update later with the same command. Uninstall with `npm uninstall -g claude-provider-switch`.

## Quick start

```bash
cc-setup
```

It asks:

1. **Which provider** — Ark, DeepSeek, an existing profile to reconfigure, or a custom endpoint
2. **Model ID** — pre-filled with the provider default
3. **API key** — typed hidden, never echoed, never leaves your machine
4. **Skip permission prompts?** — yes adds `--dangerously-skip-permissions`
5. **Make it the global default?** — default **no**

Then launch:

```bash
cc-run ark
```

## Commands

| Command | Description |
|---|---|
| `cc-setup` | Interactive provider setup |
| `cc-setup --provider ark --key sk-...` | Non-interactive |
| `cc-run <provider> [args...]` | Launch Claude Code; extra args pass through |
| `cc-list` | List profiles, models, endpoints |
| `cc-which` | Show the global default and its masked key |

Anything you can pass to `claude`, you can pass to `cc-run`:

```bash
cc-run ark -p "summarise this repo"
cc-run ark --resume
cc-run ark --add-dir ~/projects/api
```

## Built-in providers

| Name | Endpoint | Default model |
|---|---|---|
| `ark` | `https://ark.cn-beijing.volces.com/api/compatible` | `deepseek-v4-1-flash-261017` |
| `deepseek` | `https://api.deepseek.com/anthropic` | `deepseek-flash[1m]` |
| `syns` | `https://syns.onesyn.ai:18080` | `gpt-6.1-sol` |
| `custom` | you supply | you supply |

### About the `syns` gateway

A Sub2API gateway that serves OpenAI and xAI models through an Anthropic-compatible
endpoint, so Claude Code can use them.

Verified working through `/v1/messages`: `gpt-6.1-sol`, `gpt-6-sol`,
`gpt-6.1-terra`, `gpt-6-luna`, `gpt-6-astra`, `grok-4.6`, `grok-4.5`,
`codex-auto-review` (tool calling included). `grok-4.7` answers but ignores
instruction constraints.

Broken: every `claude-*` entry returns an empty response, and all `gpt-5.x`
models fail with a ChatGPT-account restriction or an empty response — only the
GPT-6 family is actually served.

Latency is 4–10 s per call (Grok slowest), so this is for capability, not speed.
The gateway also flaps: expect periodic `503` / `502` bursts.

Context: the gateway publishes no window information at all, so the preset
declares 500K with compaction at 400K. That matches the documented Codex/ChatGPT
Work default for `gpt-6.1-sol` (500K, raised from 272K in October 2026); the raw
model window is 1,050,000 with 922K max input. Note that OpenAI prices requests
above 272K input at 2x input / 1.5x output, so stay under 272K if cost matters.

The endpoints are public URLs, so they ship with the package. **API keys never do.**

## What a profile looks like

`~/.claude/providers/ark.json`, mode `0600`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://ark.cn-beijing.volces.com/api/compatible",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_MODEL": "deepseek-v4-1-flash-261017",
    "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "1000000",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "786432"
  },
  "model": "deepseek-v4-1-flash-261017",
  "modelSettings": { "deepseek-v4-1-flash-261017": { "effortLevel": "max" } },
  "effortLevel": "max"
}
```

It's an ordinary Claude Code settings document — you can edit it by hand.

## Adding an endpoint

```bash
cc-setup --provider custom
```

Or drop a JSON file in `~/.claude/providers/` yourself; `cc-list` and `cc-run` pick it up with no config changes.

## Why `--settings` instead of editing settings.json

Claude Code hot-reloads `~/.claude/settings.json` into **running** sessions, but reads `model` only once at startup. If a background process rewrites the global file, a live session can end up sending an old model name to a new endpoint — which surfaces as a `400` from the provider.

`--settings` sits above user settings in Claude Code's precedence stack and is scoped to one process, so that failure mode can't happen.

`cc-setup --set-default` still offers the global route if you want a bare `claude` to work without `cc-run`. It warns you when it does.

## Security

- Keys are written only to `~/.claude/providers/<name>.json` with mode `0600` (owner-only).
- `cc-list` and `cc-which` show masked keys only.
- Nothing is sent anywhere except the endpoint you configure.
- Profiles are not synced, so a copied `~/.claude` directory carries keys with it — treat it like `~/.ssh`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `claude was not found on your PATH` | `npm i -g @anthropic-ai/claude-code` |
| `unknown provider` | `cc-list`, then `cc-setup` |
| `Model "..." isn't recognized · context assumed to be 200k` | set `CLAUDE_CODE_MAX_CONTEXT_TOKENS` in the profile |
| `400 ... supported API model names are ...` | wrong model ID for that endpoint — re-run `cc-setup` |
| 403 `AccessDenied` | the model isn't enabled for your account |
| `Transcript saving is off — inherited CLAUDE_CODE_CHILD_SESSION marker` | fixed by `cc-run`: it strips the inherited marker before launching |

## License

MIT
