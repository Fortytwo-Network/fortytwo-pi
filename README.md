# Fortytwo Pi

[![Website fortytwo.network](https://img.shields.io/website-up-down-green-red/https/fortytwo.network.svg)](https://fortytwo.network)
[![Discord](https://img.shields.io/badge/discord-join-7289da)](https://discord.gg/fortytwo)
[![X Fortytwo](https://img.shields.io/twitter/follow/fortytwo?style=social)](https://x.com/fortytwo)

Use Fortytwo Engine with the Pi coding agent, including streaming, tool calls, image input and configurable reasoning. Requires Pi 1.4.0 or later; tested with 1.4.0.

## Install from this checkout

```sh
cd /path/to/fortytwo-pi
pi install .
```

Set `FORTYTWO_API_KEY` in your environment to your Fortytwo API key, then start Pi in the project you want to work on:

```sh
pi --provider fortytwo --model qwen/qwen3.8-27b
```

Select the model using `/model` and reasoning using `/thinking`. All normal Pi tools remain available. The package does not change your default provider, read local credential files, or write API keys to disk. Pi retains its normal local session behavior.

For a one-session trial without installing:

```sh
pi -e /path/to/fortytwo-pi --provider fortytwo --model qwen/qwen3.8-27b
```

The package is local and not yet published to npm. `pi install npm:fortytwo-pi` will be available only after publication; name ownership must be settled before that release.

## Model

| Setting | Value |
|---|---|
| Provider | `fortytwo` |
| API base | `https://api.fortytwo.network/v1` |
| Pi API | `openai-completions` (Chat Completions) |
| Model ID | `qwen/qwen3.8-27b` |
| Context | 262,144 tokens |
| Maximum output | 235,929 tokens, within remaining context |
| Input | Text and images |
| Reasoning | off, minimal, low, medium, high, xhigh, max |
| Input / cache read / output price per 1M tokens | $0.425 / $0.085 / $2.55 |

`off` sends `reasoning_effort: none`. Pi adjusts the response budget to remaining context. The maximum output is a ceiling, not a target generation length. There is no separate cache-write charge; cache creation is part of normal input. Pi's cost display is an estimate from token usage, not a billing receipt. Prices and limits were verified on 2026-10-26.

## Development

```sh
npm ci
npm run check
npm pack --dry-run
```

Change model metadata in `src/provider.ts` after checking the active Fortytwo catalog. Static metadata is intentional: Fortytwo's public `/v1/models` lists IDs but not limits or pricing. The extension makes no catalog/database requests at startup.

`npm run test:agent` checks installation and an actual agent tool cycle in a temporary profile. `npm run test:live` is an opt-in check using FORTYTWO_API_KEY; it sends synthetic requests to the live API. Verified with Pi 1.4.0: package installation, sequential tool calls, reasoning on/off, PNG image input, and 88,956 input tokens. Full context/output ceilings have not been stress-tested.

## Error handling

The extension uses Pi's built-in OpenAI Chat Completions transport. Pi reports HTTP and connection errors, preserves cancellation, and marks interrupted streams without a terminal finish reason as failures. Partial output does not turn a failed request into a success. The extension adds no retry loop; retries follow Pi's own settings. A repeated live request may incur additional usage.

Offline tests cover missing credentials, HTTP 400/401/403/429/500/502/503/504, errors inside SSE, incomplete and malformed streams, connection failure, and cancellation. These checks use synthetic responses with Pi's real transport and do not inject production failures.

## Troubleshooting

- Model unavailable: ensure the package is loaded and FORTYTWO_API_KEY is available to the Pi process; restart Pi after changing the shell environment.
- 401: check that the key belongs to the direct Fortytwo API, not the OpenRouter-compatible surface.
- 429: check account concurrency, balance and key limits. Repeated requests may incur usage.
- Unexpected metadata: check models.json for overrides and duplicate Fortytwo provider packages.

Remove the installed local package with `pi remove /path/to/fortytwo-pi`.

## License

[MIT](LICENSE) © 2026 Fortytwo.
