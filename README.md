# Orbit

> The ambient display that revolves around you.

Orbit is a secondary screen companion app for USB-C displays. It turns your second monitor into a living ambient dashboard — showing what's playing on Plex, your lighting state, system stats, clock, and weather.

## Supported Displays
- Corsair Xeneon 14" (primary target)
- Any USB-C secondary monitor

## Integrations
- **Plex** via Tautulli (API key)
- **SignalRGB** via local HTTP API
- **Home Assistant** lights (long-lived token)
- **System stats** (CPU, GPU, RAM, network)
- **Weather** (no API key required)
- More coming: Spotify, YouTube Music, Overseerr, Sonarr

## Getting Started
1. Download the latest installer from [Releases](../../releases)
2. Run `OrbitSetup-x.x.x.exe`
3. Select your display
4. Edit `config.json` with your API keys (see [Configuration](docs/configuration.md))

## Building from Source
```bash
npm install
npm start
```

## License
Commercial software. See LICENSE.md.
