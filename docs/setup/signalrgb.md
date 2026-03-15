## SignalRGB

### Local API URL

```
http://localhost:16034
```

No API key required. SignalRGB exposes a local HTTP API on port `16034` by default.

---

### Prerequisites

SignalRGB must be **running** before Orbit starts. If the app is closed, the API won't be available and the Orbit widget will show as disconnected.

---

### Put It in Orbit

**Settings → Integrations → SignalRGB**

```json
{
  "signalrgb": {
    "url": "http://localhost:16034"
  }
}
```

---

← Back to [Setup Index](./README.md)
