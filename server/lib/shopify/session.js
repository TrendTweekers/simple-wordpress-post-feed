const { getSessionStorageSafe } = require("./shopify");

/**
 * Safely get offline session ID, handling both newer and older Shopify API versions
 * NEVER throws TypeError - always returns a valid session ID string
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @param {object} shopifyApiInstance - Shopify API instance (from server/lib/shopify/shopify.js)
 * @returns {string} - Offline session ID (format: "offline_{shop}")
 */
function getOfflineIdSafe(shop, shopifyApiInstance) {
  if (!shop) {
    console.warn(`[SESSION] getOfflineIdSafe called without shop, using fallback`);
    return `offline_unknown`;
  }
  
  // Try Shopify.Utils.session.getOfflineId(shop) - this is the standard way
  if (shopifyApiInstance?.Utils?.session?.getOfflineId) {
    try {
      const offlineId = shopifyApiInstance.Utils.session.getOfflineId(shop);
      if (offlineId && typeof offlineId === 'string') {
        return offlineId;
      }
      console.warn(`[SESSION] getOfflineId returned invalid value: ${offlineId}, using fallback`);
    } catch (err) {
      console.warn(`[SESSION] getOfflineId threw error, using fallback:`, err.message);
      // Fall through to fallback
    }
  }
  
  // Fallback: construct offline ID manually (format: "offline_{shop}")
  // This is the standard format used by Shopify API
  const fallbackId = `offline_${shop}`;
  console.log(`[SESSION] Using fallback offline ID for ${shop}: ${fallbackId}`);
  return fallbackId;
}

/**
 * Load offline session for a shop from Shopify session storage
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @param {object} shopifyApi - Initialized Shopify API instance
 * @returns {Promise<Session>} - Shopify session object
 * @throws {Error} - Throws 401 error if session is missing (for reauth wrapper to catch)
 */
async function loadOfflineSession(shop, shopifyApi) {
  if (!shop) {
    const err = new Error("loadOfflineSession called without shop");
    err.status = 401;
    throw err;
  }

  if (!shopifyApi) {
    const err = new Error("loadOfflineSession called without shopifyApi");
    err.status = 401;
    throw err;
  }

  // Get offline ID safely (never throws TypeError)
  let offlineId;
  try {
    offlineId = getOfflineIdSafe(shop, shopifyApi);
  } catch (err) {
    // This should never happen, but if it does, use fallback
    console.error(`[SESSION] Unexpected error in getOfflineIdSafe:`, err);
    offlineId = `offline_${shop}`;
  }

  console.log(`[SESSION] Loading offline session for ${shop} (id=${offlineId})`);

  // Get session storage safely (checks multiple sources)
  const storage = getSessionStorageSafe(shopifyApi);
  if (!storage) {
    const err = new Error("Session storage missing after init");
    err.status = 401;
    console.error(`[SESSION] ${err.message} for ${shop}`);
    throw err;
  }

  // Load session from storage (wrap in try-catch to prevent TypeError)
  let session;
  try {
    session = await storage.loadSession(offlineId);
  } catch (err) {
    // If loadSession throws (e.g., TypeError), treat as missing session
    console.error(`[SESSION] Error loading session for ${shop} (id=${offlineId}):`, err.message || err);
    const loadErr = new Error(`Failed to load offline session for ${shop} (id=${offlineId}): ${err.message || err}`);
    loadErr.status = 401;
    loadErr.originalError = err;
    throw loadErr;
  }

  if (!session) {
    const err = new Error(`Offline session missing for ${shop} (id=${offlineId})`);
    err.status = 401;
    console.error(`[SESSION] ${err.message}`);
    throw err;
  }

  if (!session.accessToken) {
    const err = new Error(`Offline session missing accessToken for ${shop} (id=${offlineId})`);
    err.status = 401;
    console.error(`[SESSION] ${err.message}`);
    throw err;
  }

  console.log(`[SESSION] Loaded offline session for ${shop} (id=${offlineId}, isOnline: ${session.isOnline || false})`);
  return session;
}

module.exports = {
  loadOfflineSession,
  getOfflineIdSafe,
};

