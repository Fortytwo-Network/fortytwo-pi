# Fortytwo for Pi

[![npm](https://img.shields.io/npm/v/fortytwo-pi.svg)](https://www.npmjs.com/package/fortytwo-pi)
[![Discord](https://img.shields.io/badge/discord-join-7289da)](https://discord.gg/fortytwo)
[![X Fortytwo](https://img.shields.io/twitter/follow/fortytwo?style=social)](https://x.com/fortytwo)

Adds [Fortytwo](https://fortytwo.network) as a model provider to [Pi](https://pi.dev). After install, Fortytwo models appear in `/model` next to the built-in providers, with streaming, tool calls, image input and reasoning.

Setup guide: [Connect pi](https://docs.fortytwo.network/agents/pi) in the Fortytwo docs.

Requires Pi 1.4.0 or later.

## Install

```sh
pi install npm:fortytwo-pi
```

To try it for one run without installing:

```sh
pi -e npm:fortytwo-pi
```

To remove it: `pi remove npm:fortytwo-pi`.

## Add your API key

Create a key on the [API keys](https://platform.fortytwo.network/api-keys) page of the Fortytwo Platform, then use one of these:

- In Pi, run `/login`, choose **Sign in with an API key**, select **Fortytwo** and paste the key. Pi stores it in `~/.pi/agent/auth.json`.
- Or set an environment variable before you start Pi:

  ```sh
  export FORTYTWO_API_KEY="your-api-key"
  ```

Fortytwo models appear in `/model` only after Pi has a key for the provider.

## Select the model

Run `/model`, search for `qwen3.8` and choose `qwen/qwen3.8-27b [fortytwo]`. Press **Ctrl+S** to make it the default. From the command line:

```sh
pi --provider fortytwo --model qwen/qwen3.8-27b
```

While a Fortytwo model is active, the status line shows "Powered by Fortytwo".

## Models

| Model ID | Name | Context (tokens) | Max output (tokens) | Input | Input price (USD / 1M tokens) | Output price (USD / 1M tokens) | Cached input price (USD / 1M tokens) |
|---|---|---|---|---|---|---|---|
| `qwen/qwen3.8-27b` | Qwen3.8 27B | 262,144 | 235,929 | text, image | 0.425 | 2.55 | 0.085 |

Current models: [Models](https://docs.fortytwo.network/docs/models). Current prices: [Pricing](https://docs.fortytwo.network/docs/pricing).

## Reasoning

Use `/thinking` to set the reasoning level and **Ctrl+S** to save it. We recommend **medium**.

| Pi level | Sent to the API as `reasoning_effort` |
|---|---|
| off | `none`: reasoning is turned off |
| minimal, low, medium, high, xhigh, max | the same value |

Reasoning tokens count against the output limit.

## Use as the default provider

Add to `~/.pi/agent/settings.json`:

```json
{
  "defaultProvider": "fortytwo",
  "defaultModel": "qwen/qwen3.8-27b",
  "defaultThinkingLevel": "medium"
}
```

## Alternative: models.json without the package

Pi can also reach Fortytwo through `~/.pi/agent/models.json`, without installing this package. The values are in the [setup guide](https://docs.fortytwo.network/agents/pi).

## Environment variables

| Variable | Meaning |
|---|---|
| `FORTYTWO_API_KEY` | API key, sent as the Bearer token. Not needed if you added the key with `/login` |
| `FORTYTWO_BASE_URL` | Overrides `https://api.fortytwo.network/v1`. For testing only |

## Troubleshooting

- **Fortytwo is not in `/model`.** Pi has no key for the provider. Add one with `/login` or `FORTYTWO_API_KEY`, then open `/model` again.
- **Other problems.** See [Common problems](https://docs.fortytwo.network/docs/support-common-problems) or ask on [Discord](https://discord.gg/fortytwo).

## Development

```sh
npm install
npm run check        # typecheck and unit tests, no network
```

Live checks call the production API and need a key:

```sh
export FORTYTWO_API_KEY="your-api-key"
npm run test:live    # streaming, long context, reasoning, image input
npm run test:agent   # installs the package into a temporary Pi, runs a multi-step tool task with reasoning off and medium
```

## License

[MIT](LICENSE)
