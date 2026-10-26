# Fortytwo for Pi

[![Website fortytwo.network](https://img.shields.io/website-up-down-green-red/https/fortytwo.network.svg)](https://fortytwo.network)
[![Discord](https://img.shields.io/badge/discord-join-7289da)](https://discord.gg/fortytwo)
[![X Fortytwo](https://img.shields.io/twitter/follow/fortytwo?style=social)](https://x.com/fortytwo)

Fortytwo provider for [Pi](https://pi.dev), with streaming, tool calls, image input and reasoning. Requires Pi 1.4.0 or later.

## Install

```sh
pi install npm:fortytwo-pi
```

## Usage

Set your [Fortytwo API key](https://platform.fortytwo.network/api-keys) and start Pi in your project:

```sh
export FORTYTWO_API_KEY="your-api-key"
pi --provider fortytwo --model qwen/qwen3.8-27b
```

Use `/model` to select Fortytwo and `/thinking` to change the reasoning level.

## License

[MIT](LICENSE)
