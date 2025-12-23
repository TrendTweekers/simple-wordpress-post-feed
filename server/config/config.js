const env = {};

/** Global Settings */
// ✅ SIMPLIFIED: Only request write permissions (write includes read automatically)
env.SCOPES = [
  "write_themes",
  "write_script_tags",
];
env.API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";
env.GRAPHQL_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";
env.port = 3000;

/** Pub/Sub */
env.PS_TOPIC = "shopify";
env.APP = "swpf";
env.HOOK_URL =
  "https://us-central1-pluginmaker.cloudfunctions.net/Shopify-Hooks";

/** Settings depending if running in development or production */
if (process.env.NODE_ENV === "development") {
  env.SHOPIFY_API_KEY = "8a664d8080a60db1866490c2e9cc1834";
  env.SHOPIFY_API_SECRET_KEY = "a1081d3ac38bfe4f8b8580dca0347ead";
  env.TUNNEL_URL = "https://ingrid.eu.ngrok.io";
  env.TEST = true;

  /** Production Mode */
} else if (process.env.NODE_ENV === "production") {
  env.SHOPIFY_API_KEY = "312f1491e10a2848b3ef63a7cd13e91d";
  env.SHOPIFY_API_SECRET_KEY = "53c84cfb4aa7d5dee3b12f677b19fbfb";
  env.TUNNEL_URL = process.env.TUNNEL_URL || 
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 
    "https://simple-wordpress-post-feed-production.up.railway.app");
  env.TEST = false;
}

module.exports = env;
