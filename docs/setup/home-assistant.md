# Home Assistant — Lights Panel

The Home Assistant panel lets you control your smart lights directly from Orbit — toggle them on and off, adjust brightness, all without leaving the dashboard.

## What you'll need

- Home Assistant running and reachable on your network
- A long-lived access token (this is how Orbit authenticates — no username/password needed)

## Step-by-step

### 1. Create a long-lived access token

1. Open Home Assistant in your browser.
2. Click your **profile icon** in the bottom-left corner.
3. Scroll down to the **Security** tab, then find **Long-Lived Access Tokens**.
4. Click **Create Token**, give it a name (e.g. "Orbit"), and confirm.
5. **Copy the token immediately** — Home Assistant only shows it once. If you lose it, you'll need to create a new one.

### 2. Enter your details in Orbit

1. Open Orbit and click the **⚙** button in the bottom bar to open Settings.
2. Go to **Settings → Integrations → Home Assistant**.
3. Enter your Home Assistant **URL** (e.g. `http://192.168.1.100:8123`) and paste your **Token**.
4. Save your settings.

### 3. Choose which lights to display

1. In the Home Assistant integration settings, click **Browse HA**.
2. Orbit connects to your Home Assistant and shows all available entities.
3. Search or scroll to find your light entities, then tick the ones you want on the dashboard.
4. Save — your selected lights appear in the panel with toggles and brightness sliders.

## Where to enter it in Orbit

**Settings → Integrations → Home Assistant**

- **URL** — Your Home Assistant address (e.g. `http://192.168.1.100:8123`)
- **Token** — Your long-lived access token
- **Light entities** — Selected via the **Browse HA** button

## Troubleshooting

**Panel is blank or entities won't load:**
- Make sure your token hasn't been deleted in Home Assistant. You can check under Profile → Security → Long-Lived Access Tokens.
- Verify the URL is reachable — try opening it in your browser.
- Click **Browse HA** again to refresh the entity list.

**Light toggles don't work:**
- Long-lived tokens have full access by default, so permissions usually aren't the issue. Check that the light entity isn't showing as "unavailable" in Home Assistant itself.

**Wrong lights showing up:**
- Click **Browse HA** in Settings and update your selection. Untick anything you don't want and save.

← Back to [Setup Guide](./README.md)
