# System Monitor — Hardware Panel

The System Monitor panel shows live CPU, GPU, and RAM usage alongside your system uptime — all from the local machine, with no setup required.

## What you'll need

Nothing. This panel works automatically using your computer's built-in sensors. No accounts, no API keys, no external services.

## What it shows

- **CPU usage** — current load percentage from a selectable sensor
- **GPU usage and temperature** — auto-detects AMD Radeon and NVIDIA GeForce cards
- **RAM usage** — how much memory is in use
- **System uptime** — how long since the last restart

## Customising the sensors

The panel has small **⚙** buttons next to the CPU and GPU sections:

- Click the **⚙** next to **CPU** to choose which CPU sensor to display (useful if you have multiple sensors reporting).
- Click the **⚙** next to **GPU** to select your GPU if multiple are detected (e.g. integrated graphics vs. a dedicated card).

Changes apply immediately — no save needed.

## Where to enter it in Orbit

**Settings → Integrations → System Monitor**

No configuration fields — this panel works out of the box. The inline ⚙ buttons on the panel itself handle sensor selection.

## Troubleshooting

**Sensors show zero or don't appear:**
- Make sure your GPU drivers are installed (e.g. AMD Software: Adrenalin Edition or the NVIDIA app). Without drivers, sensor data may not be available.
- Try restarting Orbit — sensors sometimes need a moment to initialise on first launch.

**Wrong GPU listed:**
- Use the inline **⚙** button on the panel to manually select the correct GPU from the detected list.

**Uptime seems wrong:**
- System uptime resets on restart. If Windows fast-started (hibernated) instead of fully shutting down, the uptime counter may seem higher than expected.

← Back to [Setup Guide](./README.md)
