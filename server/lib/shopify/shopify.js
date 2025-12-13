const { Shopify } = require("@shopify/shopify-api");

function isValidStorage(s) {
  return !!s && typeof s.loadSession === "function" && typeof s.deleteSession === "function";
}

// Pass the initialized shopifyApi instance in here.
function getSessionStorageSafe(shopifyApi) {
  const candidates = [];

  // ✅ Best: instance sessionStorage (newer Shopify API pattern)
  if (shopifyApi && shopifyApi.sessionStorage) candidates.push(["shopifyApi.sessionStorage", shopifyApi.sessionStorage]);

  // ✅ Sometimes nested under config
  if (shopifyApi && shopifyApi.config && shopifyApi.config.sessionStorage)
    candidates.push(["shopifyApi.config.sessionStorage", shopifyApi.config.sessionStorage]);

  // ✅ Fallback: Context (older pattern)
  if (Shopify?.Context?.SESSION_STORAGE) candidates.push(["Shopify.Context.SESSION_STORAGE", Shopify.Context.SESSION_STORAGE]);

  for (const [name, storage] of candidates) {
    if (isValidStorage(storage)) return storage;
  }

  console.error("[SESSION STORAGE] STILL MISSING after init. Checked:", candidates.map(([n]) => n));
  return null;
}

/**
 * Export the configured Shopify instance
 * This ensures we're using the same initialized instance throughout the app
 */
module.exports = {
  shopifyApi: Shopify,
  getSessionStorageSafe,
};

