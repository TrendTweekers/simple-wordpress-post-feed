const { handleShopifyAuthError } = require("./authError");
const { loadOfflineSession } = require("./session");

/**
 * Middleware wrapper for Shopify API calls that automatically handles 401/403 errors
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
    // Load offline session
    const session = await loadOfflineSession(shop);
    if (!session || !session.accessToken) {
      throw new Error('No offline session found');
    }
    
    // Execute the API call with the session
    return await apiCall(session);
  } catch (err) {
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
    
    // Check if this is a Shopify API auth error
    const status = err.response?.status || err.statusCode || err.code || err.status;
    const isAuthError = status === 401 || status === 403;
    
    if (isAuthError && shop) {
      // Extract endpoint from error
      const endpoint = err.config?.url || 
                       err.request?.url || 
                       ctx.path || 
                       'unknown';
      
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

