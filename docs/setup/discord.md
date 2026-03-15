# Discord — Profile Panel

The Discord panel shows your profile, how many servers you're in, and quick buttons to jump into your favourite voice channels.

## What it shows

- Your Discord avatar and username
- Number of guilds (servers) you're a member of
- Favourite voice channel buttons for one-click joining

## Requirements

- A Discord Developer Application (free to create)

## How to create a Discord Developer App

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and log in.
2. Click **New Application** and give it a name (e.g. "Orbit").
3. Go to **OAuth2** in the left sidebar.
4. Under **Redirects**, click **Add Redirect** and enter: `http://127.0.0.1:8893/callback`
5. Save changes.
6. Copy your **Client ID** and **Client Secret** from the OAuth2 page.

> **Scopes needed:** `identify` and `guilds`

## Settings fields

| Field | Value |
|---|---|
| Client ID | From your Discord Developer App |
| Client Secret | From your Discord Developer App |
| Favourite Channel 1 | Name or ID of your primary voice channel |
| Favourite Channel 2 | Optional second voice channel |

## After connecting

Once authorised, the panel shows your profile and two channel buttons. Clicking a button opens Discord and takes you directly into that voice channel.

## Troubleshooting

**OAuth error or authorisation fails:**
- Confirm the redirect URI exactly matches `http://127.0.0.1:8893/callback` in your Developer App.
- Make sure both `identify` and `guilds` scopes are enabled.
- Try revoking access in Discord settings and reconnecting from Orbit.
