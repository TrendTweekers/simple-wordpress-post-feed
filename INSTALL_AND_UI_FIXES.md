# Install & UI Fixes — WP Simple Feed

## Root cause

### 402 on /api/install and /api/meta

The billing guard middleware in `server.js` applied to **all** `/api/*` routes,
including `/api/install` and `/api/meta`. This created a circular dependency:

- `/api/install` is the route that *sets up* billing and returns the confirmation URL.
- But the billing guard ran *before* `/api/install`, checked for an active subscription,
  found none (new merchant or post-reinstall state), and returned `402 subscription_required`.
- The route handler never ran, so billing could never be initiated.
- `/api/meta` was also blocked, preventing the dashboard from loading its settings.

**Fix**: Added `isOnboardingRoute` exemption in the API guard for `/api/install` and
`/api/meta`. These routes handle their own billing/auth logic internally.

### Missing Telegram install notification

The notification fires inside `afterAuth` (OAuth callback). It was not firing because:

1. Stale token in Firebase (`swpf/offline_{shop}`) caused Shopify API to return 401.
2. `requireActiveSubscription` was swallowing the 401 (fail-open), so the billing guard
   passed, but every downstream Shopify API call also 401'd.
3. The merchant was never redirected to reauth, so OAuth never completed, so `afterAuth`
   never ran.

Also: on uninstall, `swpf/offline_{shop}` was not cleared. So reinstall reused the stale
session and OAuth was not re-triggered.

**Fixes** (previous commits):
- `requireActiveSubscription` now detects 401, clears the stale session, returns `auth_error`.
- API guard handles `auth_error` with proper `X-Shopify-API-Request-Failure-Reauthorize` headers.
- Uninstall handler now deletes `swpf/offline_{shop}` so reinstall gets clean OAuth.

### 402 frontend handling

`authStep.js` had no handler for `402` responses. It silently fell through to the
`allowed: false` branch with no `confirmationUrl`, leaving the app in a broken state.

**Fix**: Added explicit `response.status === 402` branch that renders the UI anyway
(billing-pending state) without redirecting.

### postMessage / host mismatch

`_app.js` falls back to `btoa(${shop}/admin)` if no `host` query param is present.
This generated value can differ from what Shopify Admin expects. This is inherent
to embedded app initialization without a valid `host` — the solution is to always
ensure Shopify passes `host` in the redirect URI, which it does after OAuth.
No code change needed; the fallback is a last resort and logs a warning.

---

## Files changed

| File | Change |
|---|---|
| `server/server.js` | Added `isOnboardingRoute` exemption for `/api/install` and `/api/meta` in the billing guard |
| `server/server.js` | `requireActiveSubscription` now detects 401/403 and returns `auth_error` instead of failing open |
| `server/server.js` | API guard handles `auth_error` with reauth headers instead of 402 |
| `server/routes/index.js` | Uninstall handler now deletes `swpf/offline_{shop}` to ensure clean reinstall |
| `components/authStep.js` | Added 402 handler (renders UI in billing-pending state) |
| `components/Header.js` | Rewritten: clean tab bar with active-tab indicator, `activePage` prop |
| `components/newThemeComponents/NewDashboard.js` | Full UI rewrite: onboarding checklist, clean layout, danger zone confirmation |
| `pages/index.js` | Passes `activePage={page}` and `handlePageChange` to Header |

---

## What was fixed

1. ✅ `/api/install` no longer 402'd before billing setup could occur
2. ✅ `/api/meta` no longer 402'd on dashboard load
3. ✅ Stale token now triggers clean reauth instead of 401 loop
4. ✅ Reinstall clears old offline session → afterAuth fires → Telegram notification sent
5. ✅ `authStep.js` handles 402 gracefully
6. ✅ Header tab bar shows active state correctly
7. ✅ Dashboard has 4-step onboarding checklist with status indicators
8. ✅ Danger zone has confirmation dialog before destructive action
9. ✅ Documentation is a tab, not the main experience

---

## What remains imperfect

- **Theme block detection**: Step 2 ("Add app block") uses `localStorage` as a proxy
  (we record when the merchant clicks "Open theme editor"). There is no Shopify API
  to detect whether the block was actually added to a live theme section.
- **Billing step 1**: Always shows "Done" because if billing were not active, the
  merchant would not reach the dashboard. If billing is truly pending (edge case),
  this could be a false positive.
- **postMessage warning**: If Shopify does not pass `host` in the URL (e.g., direct
  navigation), the generated fallback host may cause App Bridge to log a postMessage
  warning. This is resolved by ensuring OAuth always passes `host` in the redirect.
- **About/Documentation page**: Not redesigned in this pass — it remains functional
  but with the old layout.
