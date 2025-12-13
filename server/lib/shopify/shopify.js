const { Shopify } = require("@shopify/shopify-api");

/**
 * Safely get session storage, checking multiple sources in order of preference
 * Validates that storage has required methods (loadSession, deleteSession)
 * @returns {object|null} - Valid session storage object or null if none found
 */
function getSessionStorageSafe() {
  const candidates = [];
  
  // Try Shopify.Context.SESSION_STORAGE first (this is set during Shopify.Context.initialize())
  if (Shopify.Context?.SESSION_STORAGE && typeof Shopify.Context.SESSION_STORAGE.loadSession === 'function' && typeof Shopify.Context.SESSION_STORAGE.deleteSession === 'function') {
    candidates.push({ source: 'Shopify.Context.SESSION_STORAGE', storage: Shopify.Context.SESSION_STORAGE });
  }
  
  // Try shopifyApi.sessionStorage (preferred for newer Shopify API versions)
  if (Shopify.sessionStorage && typeof Shopify.sessionStorage.loadSession === 'function' && typeof Shopify.sessionStorage.deleteSession === 'function') {
    candidates.push({ source: 'shopifyApi.sessionStorage', storage: Shopify.sessionStorage });
  }
  
  // Try shopifyApi.config?.sessionStorage (if exists)
  if (Shopify.config?.sessionStorage && typeof Shopify.config.sessionStorage.loadSession === 'function' && typeof Shopify.config.sessionStorage.deleteSession === 'function') {
    candidates.push({ source: 'shopifyApi.config.sessionStorage', storage: Shopify.config.sessionStorage });
  }
  
  // Return first valid candidate
  if (candidates.length > 0) {
    const selected = candidates[0];
    return selected.storage;
  }
  
  // No valid storage found - log error with details
  console.error(`[SESSION STORAGE] MISSING: no valid session storage found`);
  console.error(`[SESSION STORAGE] Candidates checked:`, {
    'Shopify.sessionStorage': Shopify.sessionStorage ? 'exists' : 'missing',
    'Shopify.config.sessionStorage': Shopify.config?.sessionStorage ? 'exists' : 'missing',
    'Shopify.Context.SESSION_STORAGE': Shopify.Context?.SESSION_STORAGE ? 'exists' : 'missing',
    'Shopify.Context exists': !!Shopify.Context,
    'Shopify.config exists': !!Shopify.config,
  });
  
  return null;
}

// Get the active session storage (lazy - will be evaluated when module is first required)
// Note: This may be null if Shopify.Context.initialize() hasn't been called yet
// That's okay - getSessionStorageSafe() will be called again at runtime when needed
const activeSessionStorage = getSessionStorageSafe();

/**
 * Export the configured Shopify instance and session storage
 * This ensures we're using the same initialized instance throughout the app
 */
module.exports = {
  shopifyApi: Shopify,
  sessionStorage: activeSessionStorage, // May be null, but that's handled by getSessionStorageSafe()
  getSessionStorageSafe,
};

