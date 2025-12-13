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
module.exports = require('./server');
