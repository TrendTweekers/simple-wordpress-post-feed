const config = require("../../config/config");
require("isomorphic-unfetch");
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
 * Check shop owner email and shop ID
 * @param {string} shop
 * @param {string} token
 * @return {email:string,id:number}
 */
const checkEmailId = async (shop, token) => {
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
        return {
          email: json.shop.email,
          id: json.shop.id,
          name: json.shop.shop_owner
        };
      });
    return results;
  } catch (err) {
    console.log(err);
  }
  return console.log("check email,id");
};

/**Check if shop is on affiliate plan
 * @param  {string} shop
 * @param  {string} token
 * @return {boolean}
 */
const checkDevShop = async (shop, token) => {
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
      if (json.shop.plan_name === "affiliate") {
        return true;
      }
      return false;
    });
  return devShop;
};
/** This function checking if the charge is active or not
 * @param  {string} shop
 * @param  {string} token
 * @param  {string} chargeID
 * @return {boolean}
 */
const checkCharge = async (shop, token, chargeID) => {
  const active = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeID}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": token
      }
    }
  )
    .then(response => response.json())
    .then(json => {
      if (json.recurring_application_charge.status === "active") {
        return true;
      }
      return false;
    });
  return active;
};

// exports
module.exports.checkTheme = checkTheme;
module.exports.checkEmailId = checkEmailId;
module.exports.checkDevShop = checkDevShop;
module.exports.checkCharge = checkCharge;
