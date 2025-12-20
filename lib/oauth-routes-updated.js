/**
 * Updated OAuth Routes with Scope Approval Fix
 * This replaces or modifies your existing /install/auth routes
 * 
 * Integration:
 * 1. Copy these route handlers to your server/routes/ or server/server.js
 * 2. Make sure oauth-helpers.js is in server/lib/
 * 3. Adjust import paths as needed for your project structure
 */

const crypto = require('crypto');
const { 
  checkScopesNeedApproval,
  forceDeleteSession,
  verifySessionScopes 
} = require('../lib/oauth-helpers'); // Adjust path

// Store for OAuth states (in production, use Redis or database)
const oauthStates = new Map();

/**
 * GET /install/auth
 * Initiates OAuth flow, checking if new scopes need approval
 */
router.get('/install/auth', async (ctx) => {
  const shop = ctx.query.shop;
  const host = ctx.query.host;

  if (!shop) {
    console.error('[OAUTH] Missing shop parameter');
    ctx.redirect('/');
    return;
  }

  console.log('[OAUTH START] Shop:', shop);
  console.log('[OAUTH START] Host:', host);

  try {
    // Check if we need to request new scopes
    const scopeCheck = await checkScopesNeedApproval(shop);
    
    console.log('[OAUTH] Scope check result:', scopeCheck);
    console.log('[OAUTH] Current scopes:', scopeCheck.currentScopes);
    console.log('[OAUTH] Missing scopes:', scopeCheck.missingScopes);
    console.log('[OAUTH] Needs reauth:', scopeCheck.needsReauth);

    // If we need new scopes, delete the old session
    if (scopeCheck.needsReauth && scopeCheck.currentScopes) {
      console.log('[OAUTH] Deleting old session to force scope approval');
      await forceDeleteSession(shop);
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    oauthStates.set(state, {
      shop,
      host,
      timestamp: Date.now()
    });

    // Clean old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [key, value] of oauthStates.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        oauthStates.delete(key);
      }
    }

    // Use Shopify's built-in OAuth
    await shopify.auth.begin({
      shop: shopify.api.utils.sanitizeShop(shop, true),
      callbackPath: '/install/auth/callback',
      isOnline: false,
      rawRequest: ctx.req,
      rawResponse: ctx.res,
    });

    // Note: The shopify.auth.begin() function will redirect, so code after this won't run

  } catch (error) {
    console.error('[OAUTH ERROR]', error);
    console.error('[OAUTH ERROR] Stack:', error.stack);
    
    // Redirect with error
    const errorQuery = new URLSearchParams({
      shop: shop || '',
      host: host || '',
      error: 'oauth_init_failed',
      message: error.message
    });
    
    ctx.redirect(`/?${errorQuery.toString()}`);
  }
});

/**
 * GET /install/auth/callback
 * Handles OAuth callback and verifies scopes were granted
 */
router.get('/install/auth/callback', async (ctx) => {
  const { shop, code, state, host } = ctx.query;

  console.log('[OAUTH CALLBACK] Shop:', shop);
  console.log('[OAUTH CALLBACK] Code:', code ? 'present' : 'missing');
  console.log('[OAUTH CALLBACK] State:', state);
  console.log('[OAUTH CALLBACK] Host:', host);

  try {
    // Verify state (CSRF protection)
    const storedState = oauthStates.get(state);
    if (!storedState) {
      console.error('[OAUTH CALLBACK] Invalid or expired state');
      ctx.redirect(`/?shop=${shop}&error=invalid_state`);
      return;
    }

    // Verify shop matches
    if (storedState.shop !== shop) {
      console.error('[OAUTH CALLBACK] Shop mismatch');
      ctx.redirect(`/?shop=${shop}&error=shop_mismatch`);
      return;
    }

    // Clean up used state
    oauthStates.delete(state);

    // Complete OAuth with Shopify
    const callbackResponse = await shopify.auth.callback({
      rawRequest: ctx.req,
      rawResponse: ctx.res,
    });

    const { session } = callbackResponse;

    console.log('[OAUTH CALLBACK] Session created:', session.id);
    console.log('[OAUTH CALLBACK] Shop:', session.shop);
    console.log('[OAUTH CALLBACK] Scopes granted:', session.scope);
    console.log('[OAUTH CALLBACK] Token:', session.accessToken ? 'present' : 'missing');

    // Verify all required scopes were granted
    const scopeVerification = verifySessionScopes(session);
    
    if (!scopeVerification.valid) {
      console.error('[OAUTH CALLBACK] Missing required scopes!');
      console.error('[OAUTH CALLBACK] Missing:', scopeVerification.missingScopes);
      
      ctx.redirect(`/?shop=${shop}&host=${host}&error=missing_scopes&missing=${scopeVerification.missingScopes.join(',')}`);
      return;
    }

    console.log('[OAUTH CALLBACK] ✅ All required scopes granted');

    // Success! Continue with your normal flow
    // (billing check, render app, etc.)
    
    // Redirect back to app
    const successQuery = new URLSearchParams({
      shop: session.shop,
      host: host || ctx.query.host || ''
    });

    ctx.redirect(`/?${successQuery.toString()}`);

  } catch (error) {
    console.error('[OAUTH CALLBACK ERROR]', error);
    console.error('[OAUTH CALLBACK ERROR] Stack:', error.stack);
    
    const errorQuery = new URLSearchParams({
      shop: shop || '',
      host: host || '',
      error: 'oauth_callback_failed',
      message: error.message
    });
    
    ctx.redirect(`/?${errorQuery.toString()}`);
  }
});

/**
 * GET /force-reauth
 * Temporary route to force re-authentication for existing merchants
 * This deletes their session and redirects to OAuth
 */
router.get('/force-reauth', async (ctx) => {
  const shop = ctx.query.shop;
  const host = ctx.query.host;

  if (!shop) {
    ctx.body = {
      error: 'Missing shop parameter',
      usage: '/force-reauth?shop=SHOP_DOMAIN.myshopify.com'
    };
    return;
  }

  console.log('[FORCE REAUTH] Requested for shop:', shop);

  try {
    // Delete existing session
    const deleted = await forceDeleteSession(shop);
    
    if (deleted) {
      console.log('[FORCE REAUTH] ✅ Session deleted for', shop);
    } else {
      console.log('[FORCE REAUTH] ⚠️ No session found for', shop);
    }

    // Redirect to OAuth
    const redirectQuery = new URLSearchParams({
      shop,
      ...(host && { host })
    });

    console.log('[FORCE REAUTH] Redirecting to OAuth for', shop);
    ctx.redirect(`/install/auth?${redirectQuery.toString()}`);

  } catch (error) {
    console.error('[FORCE REAUTH ERROR]', error);
    ctx.body = {
      error: 'Failed to force re-auth',
      message: error.message,
      shop
    };
    ctx.status = 500;
  }
});

/**
 * GET /check-scopes
 * Debug endpoint to check what scopes a shop currently has
 */
router.get('/check-scopes', async (ctx) => {
  const shop = ctx.query.shop;

  if (!shop) {
    ctx.body = {
      error: 'Missing shop parameter',
      usage: '/check-scopes?shop=SHOP_DOMAIN.myshopify.com'
    };
    return;
  }

  try {
    const scopeCheck = await checkScopesNeedApproval(shop);
    
    ctx.body = {
      shop,
      requiredScopes: process.env.SCOPES,
      ...scopeCheck,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[CHECK SCOPES ERROR]', error);
    ctx.body = {
      error: 'Failed to check scopes',
      message: error.message,
      shop
    };
    ctx.status = 500;
  }
});

module.exports = router;
