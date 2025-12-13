const { shopifyApi, sessionStorage } = require("./shopify");

/**
 * Safely get offline session ID, handling both newer and older Shopify API versions
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @param {object} shopifyApiInstance - Shopify API instance
 * @returns {string} - Offline session ID
 */
function getOfflineIdSafe(shop, shopifyApiInstance) {
  // Newer libs: shopifyApi.session.getOfflineId(shop)
  if (shopifyApiInstance?.session?.getOfflineId) {
    return shopifyApiInstance.session.getOfflineId(shop);
  }
  
  // Older libs / custom: offline_${shop}
  // Also fallback if Utils.session.getOfflineId exists
  if (shopifyApiInstance?.Utils?.session?.getOfflineId) {
    try {
      return shopifyApiInstance.Utils.session.getOfflineId(shop);
    } catch (err) {
      console.warn(`[SESSION] getOfflineId failed, using fallback:`, err.message);
      return `offline_${shop}`;
    }
  }
  
  // Final fallback
  return `offline_${shop}`;
}

/**
 * Load offline session for a shop from Shopify session storage
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @returns {Promise<Session>} - Shopify session object
 * @throws {Error} - Throws 401 error if session is missing (for reauth wrapper to catch)
 */
async function loadOfflineSession(shop) {
  if (!shop) {
    throw new Error("loadOfflineSession called without shop");
  }

  const offlineId = getOfflineIdSafe(shop, shopifyApi);
  console.log(`[SESSION] Loading offline session for ${shop} (id=${offlineId})`);

  const session = await sessionStorage.loadSession(offlineId);

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

