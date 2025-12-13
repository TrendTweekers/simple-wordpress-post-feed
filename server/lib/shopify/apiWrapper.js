const { handleShopifyAuthError } = require("./authError");
const { loadOfflineSession, getOfflineIdSafe } = require("./session");
const { shopifyApi, sessionStorage } = require("./shopify");
const admin = require("firebase-admin");
const config = require("../../config/config");

const { APP } = config;

/**
 * Handle TypeError (e.g., session load failures) by deleting token and triggering reauth
 * @param {Error} err - TypeError or other error
 * @param {object} ctx - Koa context
 * @param {string} shop - Shop domain
 * @param {string} host - Host parameter (for redirect)
 * @param {string} endpoint - Endpoint description (for logging)
 * @returns {boolean} - true if error was handled
 */
const handleTypeError = async (err, ctx, shop, host, endpoint = "unknown") => {
  // Log the error with full stack trace
  console.error(`[SESSION LOAD ERROR] ${endpoint} for shop ${shop}:`, {
    endpoint: endpoint,
    error: err.message || err.toString(),
    errorType: err.constructor.name,
    stack: err.stack || 'No stack trace available'
  });
  
  console.log('Session load failed, reauthing');
  
  // Delete offline session from Shopify session storage
  try {
    const sessionId = getOfflineIdSafe(shop, shopifyApi);
    await sessionStorage.deleteSession(sessionId);
    console.log(`[SESSION ERROR] Deleted offline session for ${shop} (sessionId: ${sessionId})`);
  } catch (deleteError) {
    console.error(`[SESSION ERROR] Failed to delete session for ${shop}:`, deleteError);
  }
  
  // Delete token field from Firebase (not the entire document)
  try {
    const db = admin.firestore();
    const shopRef = db.collection(APP).doc(shop);
    await shopRef.update({
      token: admin.firestore.FieldValue.delete()
    });
    console.log(`[SESSION ERROR] Deleted invalid token from Firebase for ${shop}, triggering reauth`);
  } catch (deleteError) {
    console.error(`[SESSION ERROR] Failed to delete token from Firebase for ${shop}:`, deleteError);
    // If update fails (e.g., document doesn't exist), try to delete the whole document as fallback
    try {
      const db = admin.firestore();
      await db.collection(APP).doc(shop).delete();
      console.log(`[SESSION ERROR] Deleted entire shop document from Firebase for ${shop} (fallback)`);
    } catch (fallbackError) {
      console.error(`[SESSION ERROR] Failed to delete shop document from Firebase for ${shop}:`, fallbackError);
    }
  }
  
  // Determine if this is an API request (JSON) or HTML request
  const isApiRequest = ctx.accepts("json") || ctx.path.startsWith("/api/") || ctx.get("accept")?.includes("application/json");
  
  if (isApiRequest) {
    // Return JSON response for API routes
    ctx.status = 401;
    ctx.body = {
      ok: false,
      reauth: true,
      code: "SESSION_LOAD_FAILED",
      shop: shop || null,
      message: "Session load failed - reauthentication required",
      reauthUrl: `/install/auth/toplevel?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host || '')}`
    };
    return true;
  } else {
    // Return 302 redirect for HTML requests
    const redirectUrl = `/install/auth/toplevel?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host || '')}`;
    ctx.redirect(redirectUrl);
    return true;
  }
};

/**
 * Middleware wrapper for Shopify API calls that automatically handles 401/403 errors and TypeError
 * This wraps API calls and catches authentication errors, then triggers reauth
 * 
 * Usage:
 *   const wrappedCall = shopifyApiWrapper(async (session) => {
 *     const client = new Shopify.Clients.Rest({ session });
 *     return await client.get({ path: 'themes' });
 *   });
 *   const result = await wrappedCall(shop, ctx, host, 'GET /admin/api/.../themes.json');
 * 
 * @param {Function} apiCall - Async function that takes a session and makes the API call
 * @param {string} shop - Shop domain
 * @param {object} ctx - Koa context
 * @param {string} host - Host parameter (for redirect)
 * @param {string} endpoint - Shopify API endpoint description (for logging)
 * @returns {Promise} - Result of the API call
 */
const shopifyApiWrapper = async (apiCall, shop, ctx, host, endpoint = "unknown") => {
  try {
    // Load offline session (will throw 401 error if missing)
    const session = await loadOfflineSession(shop);
    
    // Execute the API call with the session
    return await apiCall(session);
  } catch (err) {
    // Check if this is a TypeError (e.g., "Cannot read properties of undefined")
    const isTypeError = err instanceof TypeError || err.constructor.name === 'TypeError';
    
    if (isTypeError) {
      // Handle TypeError - this will delete token and redirect
      const handled = await handleTypeError(err, ctx, shop, host, endpoint);
      if (handled) {
        // Error was handled (redirected or JSON response sent)
        // Throw a special error to stop execution
        const handledError = new Error('Session load failed - reauth triggered');
        handledError.handled = true;
        throw handledError;
      }
    }
    
    // Check if this is a 401/403 error
    const status = err.response?.status || err.statusCode || err.code || err.status;
    const isAuthError = status === 401 || status === 403;
    
    if (isAuthError) {
      // Handle auth error - this will delete token and redirect
      const handled = await handleShopifyAuthError(err, ctx, shop, host, endpoint);
      if (handled) {
        // Error was handled (redirected or JSON response sent)
        // Throw a special error to stop execution
        const handledError = new Error('Shopify authentication required - reauth triggered');
        handledError.handled = true;
        throw handledError;
      }
    }
    
    // Re-throw other errors
    throw err;
  }
};

/**
 * Koa middleware that wraps route handlers and catches Shopify API errors
 * This can be used to wrap entire routes that make Shopify API calls
 * 
 * Usage:
 *   router.get('/api/data', shopifyApiMiddleware, async (ctx) => {
 *     // Your route handler that makes Shopify API calls
 *   });
 */
const shopifyApiMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // Extract shop and host from context
    const shop = ctx.query.shop || 
                 new URLSearchParams(ctx.request.header.referer || '').get("shop") ||
                 ctx.request.body?.shop;
    const host = ctx.query.host || 
                 new URLSearchParams(ctx.request.header.referer || '').get("host");
    
    if (!shop) {
      // Can't handle without shop info
      throw err;
    }
    
    // Extract endpoint from error
    const endpoint = err.config?.url || 
                     err.request?.url || 
                     ctx.path || 
                     'unknown';
    
    // Check if this is a TypeError (e.g., "Cannot read properties of undefined")
    const isTypeError = err instanceof TypeError || err.constructor.name === 'TypeError';
    
    if (isTypeError) {
      // Handle TypeError - this will delete token and redirect
      const handled = await handleTypeError(err, ctx, shop, host, endpoint);
      if (handled) {
        return; // Error was handled (redirected or JSON response sent)
      }
    }
    
    // Check if this is a Shopify API auth error
    const status = err.response?.status || err.statusCode || err.code || err.status;
    const isAuthError = status === 401 || status === 403;
    
    if (isAuthError) {
      const handled = await handleShopifyAuthError(err, ctx, shop, host, endpoint);
      if (handled) {
        return; // Error was handled (redirected or JSON response sent)
      }
    }
    
    // Re-throw if not handled
    throw err;
  }
};

module.exports = {
  shopifyApiWrapper,
  shopifyApiMiddleware,
};

