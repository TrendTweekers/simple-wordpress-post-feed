# Quick Implementation Guide

## Files to Add/Modify

### 1. Add Helper File
**Location:** `server/lib/oauth-helpers.js`
**Source:** Use the `oauth-helpers.js` file I created

### 2. Update OAuth Routes
**Location:** Find where `/install/auth` is defined (probably `server/server.js` or `server/routes/auth.js`)
**Action:** Replace or merge with the code from `oauth-routes-updated.js`

## Step-by-Step Implementation

### Step 1: Add the Helper File
```bash
# In your project root
mkdir -p server/lib
# Copy oauth-helpers.js to server/lib/oauth-helpers.js
```

### Step 2: Find Your Current OAuth Routes
Your logs show these routes exist:
- `/install/auth` - Starts OAuth
- `/install/auth/callback` - Completes OAuth

Find where these are defined. Common locations:
- `server/server.js`
- `server/routes/auth.js`
- `server/routes/authToplevel.js`
- `server/routes/index.js`

### Step 3: Update the Routes
Replace your current OAuth routes with the updated versions, or merge the key changes:

**Key changes needed:**
1. Before starting OAuth, check if scopes need approval
2. Delete old session if new scopes are needed
3. After OAuth callback, verify all scopes were granted

### Step 4: Verify Your Shopify Config
Make sure your `server/lib/firebase/firebase.js` or wherever you initialize Shopify has:

```javascript
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES.split(','),
    hostName: process.env.HOST || 'simple-wordpress-post-feed-production.up.railway.app',
    // ... other config
  },
  auth: {
    path: '/install/auth',
    callbackPath: '/install/auth/callback',
  },
  // ... other config
});
```

### Step 5: Deploy to Railway
```bash
git add .
git commit -m "Fix OAuth scope approval for read_themes"
git push origin main
```

Railway will auto-deploy.

### Step 6: Test with japexstore

Once deployed, send Aiiko this link:
```
https://simple-wordpress-post-feed-production.up.railway.app/force-reauth?shop=japexstore.myshopify.com
```

Or test yourself by visiting:
```
https://simple-wordpress-post-feed-production.up.railway.app/check-scopes?shop=japexstore.myshopify.com
```

This will show if the shop has the required scopes.

## What Should Happen

### Before the Fix:
```
1. User opens app in Shopify admin
2. App tries to call Shopify API
3. Gets 403 Forbidden: "requires merchant approval for read_themes"
4. App redirects to OAuth
5. OAuth completes but DOESN'T show approval screen
6. Infinite loop of 403 → OAuth → 403
```

### After the Fix:
```
1. User visits /force-reauth URL (or opens app and hits error)
2. Old session is deleted
3. OAuth starts with proper parameters
4. Shopify shows permission screen:
   "Simple WordPress Post Feed wants to:
    ✓ Write themes
    ✓ Read themes  <-- NEW!
    ✓ Write script tags
    ✓ Read script tags"
5. User clicks "Update" / "Approve"
6. OAuth callback verifies all scopes granted
7. App works! ✅
```

## Monitoring & Debugging

### Check Logs in Railway
Look for these log messages after deploying:

```
[OAUTH] Scope check result: ...
[OAUTH] Missing scopes: ['read_themes']
[OAUTH] Deleting old session to force scope approval
[OAUTH CALLBACK] Scopes granted: write_themes,read_themes,read_script_tags,write_script_tags
[OAUTH CALLBACK] ✅ All required scopes granted
```

### Test Endpoints
After deployment, test these URLs:

1. **Check current scopes:**
   ```
   https://your-app.railway.app/check-scopes?shop=japexstore.myshopify.com
   ```
   
   Should return JSON showing what scopes the shop has.

2. **Force re-auth:**
   ```
   https://your-app.railway.app/force-reauth?shop=japexstore.myshopify.com
   ```
   
   Should delete session and redirect to OAuth.

## Troubleshooting

### Issue: OAuth doesn't show approval screen
**Solution:** Make sure you're deleting the old session before starting OAuth.

### Issue: OAuth completes but still getting 403
**Solution:** Check the granted scopes in the callback. The session might not have `read_themes`.

### Issue: "Invalid state" error
**Solution:** The OAuth state might be expiring. Increase the timeout or use a persistent store (Redis/Database).

### Issue: Infinite redirect loop
**Solution:** Make sure the callback properly creates and saves the session before redirecting.

## Alternative: Manual OAuth URL (If Shopify Library Fails)

If the Shopify library doesn't properly request scopes, you can manually construct the OAuth URL:

```javascript
router.get('/install/auth', async (ctx) => {
  const shop = ctx.query.shop;
  const state = crypto.randomBytes(16).toString('hex');
  
  // Save state for verification
  ctx.session.state = state;
  ctx.session.shop = shop;
  
  // Manual OAuth URL with grant_options
  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${process.env.SHOPIFY_API_KEY}&` +
    `scope=${encodeURIComponent(process.env.SCOPES)}&` +
    `redirect_uri=${encodeURIComponent('https://your-app.railway.app/install/auth/callback')}&` +
    `state=${state}&` +
    `grant_options[]=per-user`;
  
  console.log('[OAUTH] Manual redirect to:', authUrl);
  ctx.redirect(authUrl);
});
```

## Contact Aiiko After Fix

Once deployed and tested, send Aiiko this message:

---

Hi Aiiko,

Great news! I've fixed the OAuth issue with the Simple WordPress Post Feed app.

**What was wrong:**
The app needed a new permission (`read_themes`) but wasn't showing you the approval screen in Shopify.

**What I fixed:**
- Modified the OAuth flow to properly request the new permission
- Added checks to ensure all required permissions are granted
- Created a direct link for you to re-authorize the app

**Next step:**
Please click this link while logged into your Shopify admin:
https://simple-wordpress-post-feed-production.up.railway.app/force-reauth?shop=japexstore.myshopify.com

This will:
1. Show you a permission approval screen
2. Ask you to approve "Read themes" permission
3. Redirect you back to the working app

After you click "Update/Approve", the app dashboard should load properly!

Let me know if you see any errors.

Best regards,
[Your name]

---

## Success Criteria

✅ Logs show: "All required scopes granted"
✅ No more 403 Forbidden errors
✅ App dashboard loads in Shopify admin
✅ No infinite redirect loops
✅ Session has `read_themes` in scope string

## Rollback Plan

If something goes wrong:
1. `git revert HEAD` to undo changes
2. `git push origin main` to deploy previous version
3. Debug locally before trying again
