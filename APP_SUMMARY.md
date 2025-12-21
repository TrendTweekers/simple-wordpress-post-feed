# Simple WordPress Post Feed - App Summary

## 📱 Application Overview

**Simple WordPress Post Feed** is a Shopify embedded app that allows merchants to display WordPress blog posts on their Shopify store. The app integrates WordPress content with Shopify themes and manages script tags for seamless content delivery.

### Key Features
- WordPress blog post integration
- Theme customization and script tag management
- Shopify OAuth authentication
- Subscription/billing management
- GDPR-compliant data handling (webhooks for redact/uninstall)

---

## 🏗️ Application Architecture

### Tech Stack
- **Frontend**: Next.js 13, React 18, Shopify Polaris UI
- **Backend**: Koa.js (Node.js), Express-style routing
- **Authentication**: Shopify OAuth 2.0 via `simple-koa-shopify-auth`
- **Database**: Firebase (Firestore) for shop data storage
- **Session Storage**: In-memory session storage (Shopify API)
- **Deployment**: Railway.app (auto-deploys from GitHub)
- **API**: Shopify REST API & GraphQL

### Project Structure

```
simple-wordpress-post-feed/
├── server/
│   ├── server.js              # Main Koa server & routing
│   ├── index.js               # Entry point
│   ├── config/
│   │   └── config.js          # Environment configuration
│   ├── lib/
│   │   ├── oauth-helpers.js   # OAuth scope management ⭐ NEW
│   │   ├── firebase/          # Firebase integration
│   │   ├── shopify/           # Shopify API wrappers
│   │   └── pubsub/            # Google Pub/Sub
│   ├── routes/
│   │   ├── index.js           # API routes (install, data, etc.)
│   │   └── authToplevel.js   # App Bridge redirect handler
│   └── handlers/              # Business logic handlers
├── pages/                     # Next.js pages
├── components/                # React components
└── store/                     # Redux state management
```

### Key Files

**`server/server.js`** - Main server file
- Initializes Shopify API context
- Sets up OAuth routes (`/install/auth`, `/install/auth/callback`)
- Handles middleware stack (session, body parser, static files)
- Routes API endpoints and Next.js pages

**`server/lib/oauth-helpers.js`** - OAuth scope management ⭐ NEW
- Checks if shops need scope re-approval
- Verifies granted scopes after OAuth
- Handles session deletion for re-authentication
- Accounts for write permissions including read permissions

**`server/config/config.js`** - Configuration
- Defines required OAuth scopes: `write_themes`, `read_themes`, `read_script_tags`, `write_script_tags`
- Environment-specific settings (dev/prod)
- API keys and tunnel URLs

---

## 🔐 OAuth Flow & Authentication

### Required Scopes
```javascript
[
  "write_themes",      // Modify theme files
  "read_themes",       // Read theme files
  "read_script_tags",  // Read script tags
  "write_script_tags"  // Create/update script tags
]
```

### OAuth Routes

1. **`/install/auth`** - Initiates OAuth flow
   - Checks if shop needs scope re-approval
   - Deletes old session if new scopes needed
   - Redirects to Shopify OAuth approval screen

2. **`/install/auth/callback`** - OAuth callback handler
   - Verifies all required scopes were granted
   - Creates billing subscription if needed
   - Redirects to app launcher

3. **`/force-reauth`** - Manual re-authentication endpoint
   - Deletes existing session
   - Forces OAuth flow restart

4. **`/check-scopes`** - Debug endpoint
   - Returns current scopes for a shop
   - Shows missing scopes if any

---

## 🐛 Recent Problems & Solutions

### Problem 1: OAuth Not Requesting Required Scopes

**Issue:**
- Merchants were getting 403 errors when the app tried to access `read_themes` permission
- OAuth callback was only granting `write_products` instead of the required theme/script tag scopes
- Merchants weren't seeing the approval screen for new scopes

**Root Cause:**
1. Scopes configuration was using `process.env.SCOPES` which might be set incorrectly
2. Fallback was a **string** instead of an **array** (Shopify API requires array)
3. `createShopifyAuth` wasn't explicitly passed scopes parameter

**Solution:**
```javascript
// ✅ FIX: Ensure SCOPES is always an array, prioritizing env.SCOPES from config
let scopesArray;
if (Array.isArray(ENV_SCOPES)) {
  scopesArray = ENV_SCOPES;  // Use config.js (already an array)
} else if (process.env.SCOPES) {
  scopesArray = process.env.SCOPES.split(",").map(s => s.trim());
} else {
  scopesArray = ["write_themes", "read_themes", "read_script_tags", "write_script_tags"];
}

Shopify.Context.initialize({
  SCOPES: scopesArray,  // ✅ Always an array
  // ...
});

// ✅ Explicitly pass scopes to OAuth middleware
const shopifyAuthMiddleware = createShopifyAuth({
  scopes: scopesArray,  // ✅ Explicitly set scopes for OAuth
  // ...
});
```

**Commit:** `9679b8d` - "Fix OAuth scopes - ensure array format and explicit scope passing"

---

### Problem 2: False "Missing Scopes" Errors

**Issue:**
- After OAuth, the app was incorrectly flagging sessions as missing `read_themes` and `read_script_tags`
- This happened even when merchants had `write_themes` and `write_script_tags` permissions
- Caused unnecessary re-authentication loops

**Root Cause:**
- Shopify's permission model: **write permissions include read permissions**
- `write_themes` automatically includes `read_themes`
- `write_script_tags` automatically includes `read_script_tags`
- Our scope verification was checking for both explicitly

**Solution:**
```javascript
// ✅ FIX: write_themes includes read_themes, write_script_tags includes read_script_tags
const missingScopes = requiredScopes.filter(required => {
  if (required === 'read_themes' && currentScopes.includes('write_themes')) {
    return false; // Not missing - write includes read
  }
  if (required === 'read_script_tags' && currentScopes.includes('write_script_tags')) {
    return false; // Not missing - write includes read
  }
  return !currentScopes.includes(required);
});
```

**Updated Functions:**
- `verifySessionScopes()` - Verifies scopes after OAuth callback
- `checkScopesNeedApproval()` - Checks if re-auth is needed before OAuth

**Commit:** `1d17c6e` - "Fix scope verification: write permissions include read permissions"

---

## 🔧 Implementation Details

### Scope Checking Before OAuth

When `/install/auth` is hit:
1. Loads existing session from storage
2. Compares current scopes vs. required scopes
3. If missing scopes detected → deletes old session
4. This forces Shopify to show approval screen

```javascript
// In server/server.js - /install/auth route handler
const scopeCheck = await checkScopesNeedApproval(shop);
if (scopeCheck.needsReauth && scopeCheck.currentScopes) {
  await forceDeleteSession(shop);  // Force approval screen
}
```

### Scope Verification After OAuth

After OAuth callback completes:
1. Verifies all required scopes were granted
2. Accounts for write permissions including read
3. If missing → deletes incomplete session and redirects with error
4. If valid → proceeds with billing/subscription flow

```javascript
// In server/server.js - afterAuth callback
const scopeVerification = verifySessionScopes(session);
if (!scopeVerification.valid) {
  await forceDeleteSession(shop);
  ctx.redirect(`/?error=missing_scopes&missing=${...}`);
  return;
}
```

---

## 📊 Recent Commits

1. **`be1ae1b`** - "Add OAuth scope approval fix for read_themes permission"
   - Added `server/lib/oauth-helpers.js`
   - Added scope checking middleware
   - Added `/force-reauth` and `/check-scopes` routes

2. **`9679b8d`** - "Fix OAuth scopes - ensure array format and explicit scope passing"
   - Fixed scopes configuration to use array format
   - Added explicit scopes parameter to `createShopifyAuth`
   - Added logging for configured scopes

3. **`1d17c6e`** - "Fix scope verification: write permissions include read permissions"
   - Updated `verifySessionScopes()` to account for write including read
   - Updated `checkScopesNeedApproval()` with same logic

---

## 🚀 Deployment

### Platform: Railway.app
- **Auto-deployment**: Triggers on push to `main` branch
- **Build**: `npm ci` → `npm run build`
- **Start**: `node server/index.js`
- **URL**: `https://simple-wordpress-post-feed-production.up.railway.app`

### Environment Variables
- `NODE_ENV=production`
- `SCOPES` (optional, defaults to config.js values)
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET_KEY`
- `RAILWAY_PUBLIC_DOMAIN` (auto-set by Railway)

---

## 🧪 Testing Endpoints

### Check Scopes
```bash
GET /check-scopes?shop=SHOP_DOMAIN.myshopify.com
```
Returns JSON with current scopes, required scopes, and missing scopes.

### Force Re-authentication
```bash
GET /force-reauth?shop=SHOP_DOMAIN.myshopify.com
```
Deletes session and redirects to OAuth flow.

---

## 📝 Key Learnings

1. **Shopify OAuth scopes must be arrays**, not strings
2. **Write permissions include read permissions** in Shopify's model
3. **Deleting old sessions** forces Shopify to show approval screen for new scopes
4. **Explicit scope passing** to OAuth middleware ensures correct permissions requested
5. **Scope verification** should happen both before and after OAuth

---

## 🔍 Monitoring & Debugging

### Log Messages to Watch For

**On Startup:**
```
[SHOPIFY INIT] Scopes configured: ["write_themes", "read_themes", "read_script_tags", "write_script_tags"]
```

**During OAuth:**
```
[AUTH-GUARD] Scope check result: { needsReauth: true, missingScopes: [...] }
[AUTH-GUARD] ⚠️ Missing scopes detected, deleting old session to force approval
```

**After OAuth:**
```
[AFTER AUTH] ✅ All required scopes granted for SHOP_DOMAIN
[AFTER AUTH] Granted scopes: write_themes,read_themes,read_script_tags,write_script_tags
```

**If Scopes Missing:**
```
[AFTER AUTH] ❌ Missing required scopes for SHOP_DOMAIN!
[AFTER AUTH] Missing scopes: [...]
```

---

## 📚 Related Files

- `server/server.js` - Main server & OAuth routes
- `server/lib/oauth-helpers.js` - Scope management utilities
- `server/config/config.js` - Scope configuration
- `server/routes/index.js` - API routes
- `package.json` - Dependencies

---

## ✅ Current Status

**All OAuth scope issues have been resolved:**
- ✅ Scopes properly configured as array
- ✅ OAuth requests correct scopes
- ✅ Scope verification accounts for write including read
- ✅ Old sessions deleted when new scopes needed
- ✅ Debug endpoints available for troubleshooting

The app should now properly request and verify all required OAuth scopes, preventing 403 errors and ensuring merchants see the approval screen when needed.
