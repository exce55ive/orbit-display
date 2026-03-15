# NZBGet — Downloads Panel

The NZBGet panel shows your active download queue, current speed, and how much data is left to download.

## What it shows

- Active download queue with item names
- Current combined download speed
- Total remaining download size

## Requirements

- NZBGet running and reachable on your network

## How to get your credentials

Use the same username and password you use to log into the NZBGet web interface. These are set during NZBGet installation (defaults are often `nzbget` / `tegbzn6789` — change them if you haven't).

## Settings fields

| Field | Value |
|---|---|
| URL | `http://YOUR-SERVER-IP:6789` |
| Username | NZBGet username |
| Password | NZBGet password |

## Notes

- Orbit polls NZBGet every **1.5 seconds** while downloads are active, so the queue and speed display stay close to real time.

## Troubleshooting

**Queue not showing:**
- Verify your URL, username, and password by logging into the NZBGet web UI directly.
- Check the port — NZBGet's default is `6789` but it may have been changed during setup.
- Ensure NZBGet is running and not paused.
