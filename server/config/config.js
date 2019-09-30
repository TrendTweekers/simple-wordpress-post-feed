const env = {};

//GLOBAL SETTINGS
env.PRICE = "3.9";
env.SCOPES = ["write_themes", "read_themes"];
env.API_VERSION = "2019-07";
env.GRAPHQL_VERSION = "2019-07";
env.port = 3000;

// Settings depending if running in development or production
if (process.env.NODE_ENV === "development") {
  env.SHOPIFY_API_KEY = "8a664d8080a60db1866490c2e9cc1834";
  env.SHOPIFY_API_SECRET_KEY = "a1081d3ac38bfe4f8b8580dca0347ead";
  env.TUNNEL_URL = "https://ingrid.eu.ngrok.io";
  env.TEST = true;
  env.COLLECTION = "wp-shopify-dev";
} else if (process.env.NODE_ENV === "production") {
  env.SHOPIFY_API_KEY = "";
  env.SHOPIFY_API_SECRET_KEY = "";
  env.TUNNEL_URL = "";
  env.TEST = false;
  env.COLLECTION = "wp-shopify";
}

module.exports = env;
