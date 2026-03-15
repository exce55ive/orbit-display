## Home Assistant

### URL

Local:
```
http://YOUR-HA-IP:8123
```

Remote: use your Nabu Casa URL or reverse proxy address.

---

### Long-Lived Access Token (LLAT)

1. Open Home Assistant.
2. Click your **Profile** (bottom-left avatar).
3. Scroll to **Long-Lived Access Tokens** → **Create Token**.
4. Name it `Orbit`. Copy the token — **it won't be shown again**.

---

### Put It in Orbit

**Settings → Integrations → Home Assistant**

```json
{
  "home_assistant": {
    "url": "http://YOUR-HA-IP:8123",
    "token": "YOUR_LONG_LIVED_ACCESS_TOKEN"
  }
}
```

---

← Back to [Setup Index](./README.md)
