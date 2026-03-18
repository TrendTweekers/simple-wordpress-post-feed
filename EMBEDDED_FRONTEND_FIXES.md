# Embedded Frontend Fixes — WP Simple Feed

## Root cause of `/api/data` 400 (shop always null)

### `getData` and `uploadData` in `server/routes/index.js`

Both handlers resolved `shop` using:
```javascript
const referer = new URLSearchParams(ctx.request.header.referer);
const shop = referer.get("shop"); // always null
```

`URLSearchParams` is designed for query strings like `shop=foo.myshopify.com&host=abc`.
When you pass it a **full URL** (e.g. `https://admin.shopify.com/...?shop=foo.myshopify.com`),
it parses the entire URL as one key and everything after `=` as its value.
The key becomes `"https://admin.shopify.com/?shop"`, not `"shop"`, so `.get("shop")` always
returns `null`.

**Fix**: Parse the Referer with `new URL(refererStr).searchParams`, and prioritise the
`?shop=` query param the frontend now passes explicitly:

```javascript
const refererStr = ctx.request.header.referer || "";
let refererShop = null, refererHost = null;
try {
  if (refererStr) {
    const u = new URL(refererStr);
    refererShop = u.searchParams.get("shop");
    refererHost = u.searchParams.get("host");
  }
} catch (_) { /* ignore malformed referer */ }
const shop = ctx.query.shop || refererShop;
const host = ctx.query.host || refererHost;
```

---

## Root cause of save button silent failure

### `NewDashboard.js` — deprecated `waitForShopify` + wrong `manualTokenFetch` signature

`handleSubmit` (save) and `handleDeleteAllMeta` (reset) both called:
```javascript
import { manualTokenFetch, waitForShopify } from "../../lib/manualTokenFetch";

const isReady = await waitForShopify(3000); // ❌ throws "waitForShopify is deprecated"
await manualTokenFetch("/api/data", { method: "POST", body: ... }); // ❌ wrong sig
```

`waitForShopify` is a deprecated stub — it always throws. The error was caught silently,
so the save appeared to do nothing. Even if `waitForShopify` had succeeded, the
`manualTokenFetch` call was wrong: it expects `(url, token, options)` but received
`(url, options)` — the options object was passed as the Bearer token, producing an invalid
`Authorization: Bearer [object Object]` header that the server rejected.

**Fix**: Use the App Bridge v3 pattern — `getSessionToken(app)` then pass the token
explicitly to `manualTokenFetch`:

```javascript
import { manualTokenFetch } from "../../lib/manualTokenFetch";
import { getSessionToken } from "@shopify/app-bridge-utils";

const token = await getSessionToken(app);
const response = await manualTokenFetch("/api/data", token, {
  method: "POST",
  body: JSON.stringify({ settings }),
});
```

---

## Files changed

| File | Change |
|---|---|
| `server/routes/index.js` | `getData`: fixed Referer URL parsing from `new URLSearchParams(fullUrl)` to `new URL(str).searchParams`; shop now also read from `ctx.query.shop` |
| `server/routes/index.js` | `uploadData`: same Referer fix in main body and catch block |
| `components/newThemeComponents/NewDashboard.js` | Removed `waitForShopify` import; added `getSessionToken` import; fixed `manualTokenFetch` call signature in both `handleSubmit` and `handleDeleteAllMeta` |
| `pages/index.js` | `fetchShopData`: added `?shop=` query param to `/api/data` GET request so server always receives it via `ctx.query.shop` |

---

## What was fixed

1. ✅ `/api/data` GET no longer returns 400 / null shop — `?shop=` is passed from frontend and parsed correctly on server
2. ✅ `/api/data` POST (save settings) no longer silently fails — `waitForShopify` removed, correct token passed
3. ✅ Delete all settings no longer silently fails — same `waitForShopify` / token fix
4. ✅ Auth errors in save/delete now log a meaningful message instead of swallowing silently
5. ✅ `/api/data` catch block also uses correct Referer parsing for auth-error recovery
