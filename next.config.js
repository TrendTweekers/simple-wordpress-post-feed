const withSass = require("@zeit/next-sass");
const APIconfig = require("./server/config/config");
const withCSS = require("@zeit/next-css");

const webpack = require("webpack");
const { SHOPIFY_API_KEY } = APIconfig;
const apiKey = JSON.stringify(SHOPIFY_API_KEY);

module.exports = withSass(
  withCSS({
    webpack: config => {
      const env = { API_KEY: apiKey };
      config.plugins.push(new webpack.DefinePlugin(env));
      return config;
    }
  })
);
