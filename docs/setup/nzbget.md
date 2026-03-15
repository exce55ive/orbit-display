## NZBGet

### URL

```
http://YOUR-SERVER-IP:6789
```

---

### Auth

NZBGet uses username/password — no API key.

Default credentials:
```
username: nzbget
password: tegbzn6789
```

**Change the default password** (you should):

NZBGet → **Settings → Security → ControlPassword**

---

### Put It in Orbit

**Settings → Integrations → NZBGet**

```json
{
  "nzbget": {
    "url": "http://YOUR-SERVER-IP:6789",
    "username": "nzbget",
    "password": "YOUR_PASSWORD"
  }
}
```

---

← Back to [Setup Index](./README.md)
