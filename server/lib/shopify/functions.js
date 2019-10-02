const config = require("../../config/config");

const { API_VERSION } = config;

/**
 * Containing functions used to retrive and work data from Shopify
 * # checkBlogs - fetch blog data
 * # checkTheme - fetch current theme
 */

/**
 * Get current Theme ID
 * @param {*} shop
 * @param {*} token
 */

const checkTheme = async (shop, token) => {
  try {
    const results = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/themes.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token
        }
      }
    )
      .then(response => response.json())
      .then(json => {
        const mainTheme = json.themes.filter(theme => theme.role === "main");
        return mainTheme[0].id;
      });
    return results;
  } catch (err) {
    console.log(err);
  }
  return console.log("check main theme end");
};

/**
 * Check shop owner email
 * @param {*} shop
 * @param {*} token
 */
const checkEmail = async (shop, token) => {
  try {
    const results = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token
        }
      }
    )
      .then(response => response.json())
      .then(json => {
        return json.shop.email;
      });
    return results;
  } catch (err) {
    console.log(err);
  }
  return console.log("check email");
};

// exports
module.exports.checkTheme = checkTheme;
module.exports.checkEmail = checkEmail;
