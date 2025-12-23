const webpack = require("webpack");
const APIconfig = require("./server/config/config");
const { default: Shopify } = require("@shopify/shopify-api");

const localeSubpaths = {};
const { SHOPIFY_API_KEY } = APIconfig;

const apiKey = JSON.stringify(SHOPIFY_API_KEY);

module.exports = {
  // ✅ CRITICAL: assetPrefix must be empty string - bad assetPrefix causes blank screen
  assetPrefix: '',
  basePath: '',
  useFileSystemPublicRoutes: true,
  trailingSlash: false, // Disabled to prevent 308 redirect loops on /install/auth
  // ✅ CRITICAL: Expose SHOPIFY_API_KEY as environment variable for App Bridge
  env: {
    NEXT_PUBLIC_SHOPIFY_API_KEY: SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '312f1491e10a2848b3ef63a7cd13e91d',
  },
  webpack: (config) => {
    const env = { 
      API_KEY: apiKey,
      'process.env.NEXT_PUBLIC_SHOPIFY_API_KEY': JSON.stringify(SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '312f1491e10a2848b3ef63a7cd13e91d'),
    };
    config.plugins.push(new webpack.DefinePlugin(env));
    // Add ESM support for .mjs files in webpack 4
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    return config;
  },
};
