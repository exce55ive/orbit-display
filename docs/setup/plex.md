## Plex

### Server URL

Local (most common):
```
http://YOUR-NAS-IP:32400
```

Remote: open Plex → **Settings → Remote Access** — your external URL is listed there.

---

### Get Your X-Plex-Token

**Method A — Browser DevTools**

1. Open [https://app.plex.tv](https://app.plex.tv) and sign in.
2. Open DevTools → **Network** tab.
3. Click any request. Look in the **Request Headers** for `X-Plex-Token`.

**Method B — URL query param**

1. Open [https://app.plex.tv/desktop](https://app.plex.tv/desktop) and sign in.
2. In the Network tab, inspect any request URL — `X-Plex-Token` appears as a query parameter.

**Method C — API (curl)**

```bash
curl -u 'your@email.com:yourpassword' \
  'https://plex.tv/users/sign_in.json' \
  -X POST -H 'X-Plex-Client-Identifier: orbit'
```

Pull `user.authToken` from the JSON response.

---

### Put It in Orbit

**Settings → Integrations → Plex**

```json
{
  "plex": {
    "url": "http://YOUR-NAS-IP:32400",
    "token": "YOUR_X_PLEX_TOKEN"
  }
}
```

---

← Back to [Setup Index](./README.md)
