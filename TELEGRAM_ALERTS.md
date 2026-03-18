# Telegram Alerts — WP Simple Feed

Real-time Telegram notifications for key lifecycle events.

## Environment variables

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_CHAT_ID` | Chat/channel ID to send messages to |

If either variable is unset, all notifications are silently skipped — the app continues normally.

Set these in Railway under **Variables** (or in `.env` locally).

---

## Alert events

### 🟢 New Install
**Trigger:** Fresh OAuth flow completed (afterAuth)
**File:** `server/server.js` — afterAuth block (~line 330)
**Message:**
```
🟢 New Install — WP Simple Feed
🏪 shop.myshopify.com
🌍 Country: Unknown
📅 Wed, 18 Mar 2026 08:00:00 GMT
```
**Note:** Only fires on fresh OAuth. Existing sessions resuming the app do NOT trigger this.

---

### 🔔 Trial Started
**Trigger:** `initShop` called — shop record written to Firestore, billing screen about to be shown
**File:** `server/handlers/checkShop.js` (~line 60)
**Message:**
```
🔔 Trial Started — WP Simple Feed
🏪 shop.myshopify.com
⏳ Trial: 7 days
📅 Wed, 18 Mar 2026 08:00:00 GMT
```

---

### 🔔 Trial Activated
**Trigger:** `app_subscriptions/update` webhook fires with `status: ACTIVE` and `trial_days > 0`
**File:** `server/server.js` — `/webhooks/billing` route (~line 1150)
**Message:**
```
🔔 Trial Activated — WP Simple Feed
🏪 shop.myshopify.com
⏳ 7 trial days remaining
📅 Wed, 18 Mar 2026 08:00:00 GMT
```

---

### 💰 Paid Conversion
**Trigger:** `app_subscriptions/update` webhook fires with `status: ACTIVE` and `trial_days === 0`
**File:** `server/server.js` — `/webhooks/billing` route (~line 1150)
**Message:**
```
💰 Paid Conversion — WP Simple Feed
🏪 shop.myshopify.com
💵 $7.90/mo
📅 Wed, 18 Mar 2026 08:00:00 GMT
```

---

### 💸 Subscription Cancelled/Expired/Declined
**Trigger:** `app_subscriptions/update` webhook fires with `status: CANCELLED`, `EXPIRED`, or `DECLINED`
**File:** `server/server.js` — `/webhooks/billing` route (~line 1153)
**Also sets:** `status: "cancelled"` in Firestore
**Message:**
```
💸 Subscription Cancelled — WP Simple Feed
🏪 shop.myshopify.com
📅 Wed, 18 Mar 2026 08:00:00 GMT
```
Status is title-cased from the raw Shopify value — can be `Cancelled`, `Expired`, or `Declined`.

---

### 🔴 Uninstall
**Trigger:** `app/uninstalled` Shopify webhook
**File:** `server/routes/index.js` — `uninstall` handler (~line 298)
**Also sets:** `status: "cancelled"` in Firestore
**Message:**
```
🔴 Uninstall — WP Simple Feed
🏪 shop.myshopify.com
⏱ Time since install: 3 days
📅 Wed, 18 Mar 2026 08:00:00 GMT
```
Includes `⚠️ Same-day uninstall!` flag if uninstall happens within 24h of install.

---

### 🚨 Critical Error — Firebase write failure
**Trigger:** Firebase `writeFs` throws during afterAuth (shop token could not be saved)
**File:** `server/server.js` — afterAuth Firebase catch block (~line 281)
**Message:**
```
🚨 CRITICAL ERROR — WP Simple Feed
🏪 shop.myshopify.com
❌ Firebase write failed in afterAuth
⚠️ Error message here
📅 Wed, 18 Mar 2026 08:00:00 GMT
```

---

### 📊 Daily Summary (08:00 UTC)
**Trigger:** node-cron schedule `0 8 * * *`
**File:** `server/server.js` — cron block after `server.listen()`
**Message:**
```
📊 WP Simple Feed — Daily Summary
🟢 New installs (24h): 3
💰 Paying merchants: 12
💵 Est. MRR: $94.80
📅 Wed, 18 Mar 2026 08:00:00 GMT
```
Only counts shops with `status === "active"` in Firestore.

---

## Notification helper

**File:** `server/lib/telegram/index.js`

```js
const sendTelegram = async (message) => { ... }
module.exports = { sendTelegram };
```

Used via `require("../lib/telegram/index.js")` — imported in:
- `server/server.js`
- `server/routes/index.js`
- `server/handlers/checkShop.js`

---

## How to test each alert manually

### Install
Uninstall the app from a dev store, then reinstall. The OAuth flow will trigger afterAuth.

### Trial Started
Same as install — `initShop` fires as part of the install flow.

### Trial Activated / Paid Conversion
Send a test webhook from Shopify Partners dashboard:
**Partners → App → Webhooks → Send test notification → app_subscriptions/update**
Or use curl:
```bash
curl -X POST https://your-railway-url.com/webhooks/billing \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: <valid_hmac>" \
  -d '{"app_subscription":{"status":"ACTIVE","trial_days":7}}'
```

### Uninstall
Uninstall the app from a test store. Shopify sends the webhook to `/swpf/uninstall`.

### Critical Error
Temporarily break the Firebase credentials in Railway env vars, trigger an install, then restore them.

### Daily Summary
Temporarily change the cron schedule to fire 1 minute from now, deploy, wait, then restore:
```js
cron.schedule("* * * * *", async () => { ... }); // every minute
```
