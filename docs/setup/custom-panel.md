# Custom / Embed Panel

Embed any URL as an Orbit panel. If it runs in a browser, it runs in Orbit — Grafana dashboards, custom monitoring pages, internal tools, whatever you've got on your LAN.

## Configuration

| Field | Description | Default |
|---|---|---|
| `url` | The full URL to embed (e.g. `http://grafana.local:3000/d/my-dashboard`) | — |
| `title` | Display name shown in the panel header | `Custom` |
| `zoom` | Zoom level for the embedded page. Range: `0.5` – `2.0` | `1.0` |

## Where to configure

- **Settings → Panels → Custom Panel** — add or edit an existing embed panel.
- **Setup Wizard** — available during initial setup.
- **Add Panel Gallery** — click **+** on the dashboard, pick **Custom / Embed**, and fill in the URL.

## Use cases

- **Grafana dashboards** — embed a specific dashboard URL and adjust zoom to fit the panel.
- **Custom monitoring pages** — any internal web page your services expose.
- **Local web services** — Portainer, Pi-hole admin, router status pages, anything with an HTTP interface.

## Known limitations

Some sites set `X-Frame-Options` or `Content-Security-Policy` headers that block iframe embedding. If a page refuses to load inside the panel, that site is explicitly blocking it. This is a browser security policy, not an Orbit bug — there is no workaround on the client side.

Sites you host yourself (Grafana, Home Assistant, etc.) can usually be configured to allow framing. Check the service's docs for iframe or embedding settings.
