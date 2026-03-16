# SignalRGB — Lighting Panel

The SignalRGB panel shows your available lighting effects and lets you switch between them instantly from Orbit.

## What you'll need

- SignalRGB installed and **running on the same machine as Orbit**

> **No credentials needed.** Orbit connects to SignalRGB's local REST API automatically — it's enabled by default on port 16038. There's nothing to configure.

## Step-by-step

### 1. Make sure SignalRGB is running

SignalRGB needs to be open on the same Windows machine where Orbit is installed. It won't work over the network — both apps must be on the same computer.

### 2. Check it in Orbit

1. Open Orbit — the SignalRGB panel should automatically detect your effects and show them.
2. Click any effect name in the panel to activate it. Changes apply immediately across all your connected RGB devices.

## Where to enter it in Orbit

**Settings → Integrations → SignalRGB**

No fields to fill in — Orbit connects to SignalRGB automatically on `localhost:16038`. If you've changed the SignalRGB port, update it in Orbit's Settings.

## Troubleshooting

**Panel shows "offline" or no effects listed:**
- Confirm SignalRGB is open and running on the same machine as Orbit.
- Check that the REST API is enabled in SignalRGB's settings.
- Try restarting SignalRGB and then refreshing Orbit.

**Effects apply in Orbit but nothing changes on my hardware:**
- This is a SignalRGB issue, not an Orbit one. Make sure your RGB devices are detected and working within SignalRGB itself.

**Changed the SignalRGB port and now it won't connect:**
- Update the port in **Settings → Integrations → SignalRGB** inside Orbit to match.

← Back to [Setup Guide](./README.md)
