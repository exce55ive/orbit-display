# System Monitor Panel

The System Monitor panel shows live CPU, GPU, and RAM stats alongside your system uptime — all from the local machine, no external services needed.

## What it shows

- CPU usage (from a selectable sensor)
- GPU usage and temperature (auto-detects AMD Radeon and NVIDIA GeForce)
- RAM usage
- System uptime

## Requirements

- No external services or accounts needed
- Runs entirely on local system data

## How to configure

The panel has inline ⚙ buttons for quick sensor selection:

1. Click the **⚙** next to the CPU section to choose which CPU sensor to display.
2. Click the **⚙** next to the GPU section to select your GPU if multiple are detected.
3. Changes apply immediately — no save required.

## Notes

- GPU detection is automatic. If you have both an integrated GPU and a dedicated card, use the inline ⚙ to select the right one.
- Uptime resets on system restart.

## Troubleshooting

**Sensors show zero or don't populate:**
- Ensure GPU vendor software or sensor drivers are installed (e.g. AMD Software or NVIDIA app).
- Try restarting Orbit — sensors sometimes need a moment to initialise on first launch.

**Wrong GPU listed:**
- Use the inline ⚙ to manually select the correct GPU from the detected list.
