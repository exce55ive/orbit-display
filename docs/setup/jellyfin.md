## Jellyfin

### URL

```
http://YOUR-SERVER-IP:8096
```

---

### API Key

Jellyfin → **Dashboard → Advanced → API Keys → +**

Give it a name (e.g. `Orbit`) and copy the key.

---

### Put It in Orbit

**Settings → Integrations → Jellyfin**

```json
{
  "jellyfin": {
    "url": "http://YOUR-SERVER-IP:8096",
    "api_key": "YOUR_JELLYFIN_API_KEY"
  }
}
```

---

← Back to [Setup Index](./README.md)
