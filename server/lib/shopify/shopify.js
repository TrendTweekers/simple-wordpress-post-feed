const { Shopify } = require("@shopify/shopify-api");

/**
 * Export the configured Shopify instance and session storage
 * This ensures we're using the same initialized instance throughout the app
 */
module.exports = {
  shopifyApi: Shopify,
  sessionStorage: Shopify.Context.SESSION_STORAGE,
};

