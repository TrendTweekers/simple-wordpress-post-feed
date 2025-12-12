const { Shopify } = require("@shopify/shopify-api");

/**
 * Load offline session for a shop from Shopify session storage
 * @param {string} shop - Shop domain (e.g., "example.myshopify.com")
 * @returns {Promise<Session|null>} - Shopify session object or null if not found
 */
const loadOfflineSession = async (shop) => {
  try {
    // Get offline session ID (format: "offline_{shop}")
    const sessionId = Shopify.Utils.session.getOfflineId(shop);
    
    // Load session from session storage
    const session = await Shopify.Context.SESSION_STORAGE.loadSession(sessionId);
    
    if (!session || !session.accessToken) {
      console.log(`[SESSION] No offline session found for ${shop} (sessionId: ${sessionId})`);
      return null;
    }
    
    console.log(`[SESSION] Loaded offline session for ${shop} (sessionId: ${sessionId}, isOnline: ${session.isOnline || false})`);
    return session;
  } catch (error) {
    console.error(`Error loading offline session for ${shop}:`, error);
    return null;
  }
};

module.exports = {
  loadOfflineSession,
};

