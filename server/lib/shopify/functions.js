const config = require("../../config/config");

const { API_VERSION } = config;

/**
 * Containing functions used to retrive and work data from Shopify
 * # checkBlogs - fetch blog data
 * # checkTheme - fetch current theme
 */

/**
 * Get currently used Theme ID
 * @param {string} shop
 * @param {string} token
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
 * @param {string} shop
 * @param {string} token
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

/**Check if shop is on affiliate plan
 * @param  {string} shop
 * @param  {string} token
 */
const checkDevShop = async (shop, token) => {
  try {
    const devShop = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token
        }
      }
    )
      .then(response => response.json())
      .then(json => {
        console.log(`${json.shop.plan_name} plan active`);
        if (json.shop.plan_name === "affiliate") {
          return "DEV";
        }
        return "ACTIVE";
      });
    return devShop;
  } catch (err) {
    console.log(err);
  }
};

// exports
module.exports.checkTheme = checkTheme;
module.exports.checkEmail = checkEmail;
module.exports.checkDevShop = checkDevShop;
