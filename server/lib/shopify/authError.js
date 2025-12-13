const { getOfflineIdSafe } = require("./session");
const { shopifyApi, getSessionStorageSafe } = require("./shopify");
const admin = require("firebase-admin");
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
  const responseDataStr = JSON.stringify(responseData).substring(0, 500); // Truncate to 500 chars for better debugging
  
  // Extract x-request-id header if available
  const xRequestId = err.response?.headers?.['x-request-id'] || err.response?.headers?.['X-Request-Id'] || err.headers?.['x-request-id'] || err.headers?.['X-Request-Id'] || 'none';
  
  // Extract request URL/endpoint from error if available
  const requestUrl = err.config?.url || err.request?.url || err.url || endpoint;
  
  // Log the exact endpoint and error with full details
  console.error(`[SHOPIFY API ${status}] ${endpoint} for shop ${shop}:`, {
    endpoint: endpoint,
    requestUrl: requestUrl,
    status: status,
    statusText: err.response?.statusText || err.statusText || 'N/A',
    responseData: responseDataStr,
    xRequestId: xRequestId,
    error: err.message || err.toString(),
    stack: err.stack ? err.stack.substring(0, 300) : undefined // Include first 300 chars of stack trace
  });
  
  // Delete offline session from Shopify session storage (if available)
  const sessionStorage = getSessionStorageSafe(shopifyApi);
  if (sessionStorage) {
    try {
      // Delete session from Shopify session storage (using safe function)
      const sessionId = getOfflineIdSafe(shop, shopifyApi);
      await sessionStorage.deleteSession(sessionId);
      console.log(`[AUTH ERROR] Deleted offline session for ${shop} (sessionId: ${sessionId})`);
    } catch (deleteError) {
      console.error(`[AUTH ERROR] Failed to delete session for ${shop}:`, deleteError);
    }
  } else {
    console.warn(`[AUTH ERROR] Session storage not available, skipping session deletion for ${shop}`);
  }
  
  // Delete token field from Firebase (not the entire document)
  try {
    const db = admin.firestore();
    const shopRef = db.collection(APP).doc(shop);
    await shopRef.update({
      token: admin.firestore.FieldValue.delete()
    });
    console.log(`[AUTH ERROR] Deleted invalid token from Firebase for ${shop}, triggering reauth`);
  } catch (deleteError) {
    console.error(`[AUTH ERROR] Failed to delete token from Firebase for ${shop}:`, deleteError);
    // If update fails (e.g., document doesn't exist), try to delete the whole document as fallback
    try {
      const db = admin.firestore();
      await db.collection(APP).doc(shop).delete();
      console.log(`[AUTH ERROR] Deleted entire shop document from Firebase for ${shop} (fallback)`);
    } catch (fallbackError) {
      console.error(`[AUTH ERROR] Failed to delete shop document from Firebase for ${shop}:`, fallbackError);
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

