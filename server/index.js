// Version stamp to verify deployed code
console.log("[VERSION]", {
  commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "no-sha",
  builtAt: process.env.BUILD_TIME || "no-build-time",
  nodeEnv: process.env.NODE_ENV,
});

console.log("BOOT: KOA server/index.js is running");
console.log("BOOT: Koa server/index.js starting, NODE_ENV=", process.env.NODE_ENV);
console.log("BOOT: Custom Koa server will handle all routes including /install/auth");

require('@babel/register')({
  presets: ['@babel/preset-env'],
  ignore: ['node_modules'],
});

// Import the rest of our application (this will initialize Shopify.Context)
const server = require('./server');

// Log session storage status after Shopify initialization
try {
  const { getSessionStorageSafe, shopifyApi } = require('./lib/shopify/shopify');
  const sessionStorage = getSessionStorageSafe(shopifyApi);
  if (sessionStorage) {
    // Determine which source was used
    let source = 'unknown';
    const { Shopify } = require('@shopify/shopify-api');
    if (sessionStorage === Shopify.Context?.SESSION_STORAGE) {
      source = 'Shopify.Context.SESSION_STORAGE';
    } else if (sessionStorage === shopifyApi.sessionStorage) {
      source = 'shopifyApi.sessionStorage';
    } else if (sessionStorage === shopifyApi.config?.sessionStorage) {
      source = 'shopifyApi.config.sessionStorage';
    }
    console.log(`[SESSION STORAGE] Boot check: active = ${source}`);
    console.log(`[SESSION STORAGE] Boot check: loadSession = ${typeof sessionStorage.loadSession === 'function' ? 'function' : 'missing'}`);
    console.log(`[SESSION STORAGE] Boot check: deleteSession = ${typeof sessionStorage.deleteSession === 'function' ? 'function' : 'missing'}`);
  } else {
    console.error(`[SESSION STORAGE] Boot check: WARNING - No valid session storage found`);
  }
} catch (err) {
  console.error(`[SESSION STORAGE] Boot check failed:`, err.message);
}

module.exports = server;
