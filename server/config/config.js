/* eslint-disable no-undef */
const env = {};

/** Global Settings */
env.SCOPES = [
  "write_themes",
  "read_themes",
  "read_script_tags",
  "write_script_tags"
];
env.API_VERSION = "2019-10";
env.GRAPHQL_VERSION = "2019-07";
env.port = 3000;

/** Pub/Sub */
env.PS_TOPIC = "shopify";
env.PS_APP = "swpf";

/** Settings depending if running in development or production */
if (process.env.NODE_ENV === "development") {
  env.SHOPIFY_API_KEY = "8a664d8080a60db1866490c2e9cc1834";
  env.SHOPIFY_API_SECRET_KEY = "a1081d3ac38bfe4f8b8580dca0347ead";
  env.TUNNEL_URL = "https://ingrid.eu.ngrok.io";
  env.TEST = true;
  env.APP = "swpf";

  /** Production Mode */
} else if (process.env.NODE_ENV === "production") {
  env.SHOPIFY_API_KEY = "312f1491e10a2848b3ef63a7cd13e91d";
  env.SHOPIFY_API_SECRET_KEY = "53c84cfb4aa7d5dee3b12f677b19fbfb";
  env.TUNNEL_URL =
    "https://shopify-wordpress-post-feed-app-rga4phvsoq-uc.a.run.app";
  env.TEST = false;
  env.APP = "swpf";
}

module.exports = env;
