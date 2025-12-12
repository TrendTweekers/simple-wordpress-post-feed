const { Shopify } = require("@shopify/shopify-api");
const { deleteFs } = require("../firebase/firebase");
const config = require("../../config/config");

const { APP } = config;

/**
 * Handle Shopify API authentication errors (401/403)
 * - Deletes offline session/access token from Firebase
 * - Returns appropriate response (302 redirect for HTML, 401 JSON for API)
 * 
 * @param {Error} err - Error object from Shopify API call
 * @param {object} ctx - Koa context
 * @param {string} shop - Shop domain
 * @param {string} host - Host parameter (for redirect)
 * @param {string} endpoint - Shopify API endpoint that was called (for logging)
 * @returns {boolean} - true if error was handled, false otherwise
 */
const handleShopifyAuthError = async (err, ctx, shop, host, endpoint = "unknown") => {
  // Check if this is a 401/403 error
  const status = err.response?.status || err.statusCode || err.code || err.status;
  const isAuthError = status === 401 || status === 403;
  
  if (!isAuthError) {
    return false; // Not an auth error, don't handle
  }
  
  // Extract error response data (truncated for logging)
  const responseData = err.response?.data || err.response?.body || err.body || err.data || {};
  const responseDataStr = JSON.stringify(responseData).substring(0, 200); // Truncate to 200 chars
  
  // Extract x-request-id header if available
  const xRequestId = err.response?.headers?.['x-request-id'] || err.response?.headers?.['X-Request-Id'] || err.headers?.['x-request-id'] || err.headers?.['X-Request-Id'] || 'none';
  
  // Log the exact endpoint and error with full details
  console.error(`[SHOPIFY API ${status}] ${endpoint} for ${shop}:`, {
    endpoint,
    status,
    responseData: responseDataStr,
    xRequestId,
    error: err.message || err
  });
  
  // Delete offline session from Firebase
  try {
    // Delete session from Shopify session storage
    const sessionId = Shopify.Utils.session.getOfflineId(shop);
    await Shopify.Context.SESSION_STORAGE.deleteSession(sessionId);
    console.log(`[AUTH ERROR] Deleted offline session for ${shop} (sessionId: ${sessionId})`);
  } catch (deleteError) {
    console.error(`[AUTH ERROR] Failed to delete session for ${shop}:`, deleteError);
  }
  
  // Delete token from Firebase
  try {
    await deleteFs(APP, shop);
    console.log(`[AUTH ERROR] Deleted shop data from Firebase for ${shop}`);
  } catch (deleteError) {
    console.error(`[AUTH ERROR] Failed to delete Firebase data for ${shop}:`, deleteError);
  }
  
  // Determine if this is an API request (JSON) or HTML request
  const isApiRequest = ctx.accepts("json") || ctx.path.startsWith("/api/") || ctx.get("accept")?.includes("application/json");
  
  if (isApiRequest) {
    // Return JSON response for API routes
    ctx.status = 401;
    ctx.body = {
      ok: false,
      reauth: true,
      code: "SHOPIFY_AUTH_REQUIRED",
      shop: shop || null,
      message: "Shopify authentication required",
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

module.exports = {
  handleShopifyAuthError,
};

