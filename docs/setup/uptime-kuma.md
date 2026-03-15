## Uptime Kuma

### URL

```
http://YOUR-SERVER-IP:3001
```

---

### API Key (optional)

Some Orbit features only need the status page URL. If you need API access:

Uptime Kuma → **Settings → API Keys → Add API Key**

Name it `Orbit`, copy the key.

---

### Put It in Orbit

**Settings → Integrations → Uptime Kuma**

```json
{
  "uptime_kuma": {
    "url": "http://YOUR-SERVER-IP:3001",
    "api_key": "YOUR_KUMA_API_KEY"
  }
}
```

Omit `api_key` if you're only using the public status page.

---

← Back to [Setup Index](./README.md)
