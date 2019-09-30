const config = require("../../config/config");

const { API_VERSION } = config;

/**
 * Containing functions used to retrive and work data from Shopify
 * # checkBlogs - fetch blog data
 * # checkTheme - fetch current theme
 * # isBlogEmpty - check if blog array is empty
 */

/**
 * Fetch Blogs from Shopify API
 * @param {String} shop
 * @param {String} token
 */

const checkBlogs = async (shop, token) => {
  try {
    const results = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/blogs.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token
        }
      }
    )
      .then(response => response.json())
      .then(json => {
        const convert = array =>
          array.reduce((obj, item) => {
            obj[item.handle] = item;
            return obj;
          }, {});
        const blogs = convert(json.blogs);
        // console.log(blogs);
        return blogs;
      });
    return results;
  } catch (err) {
    console.log(err);
  }
  return results;
};

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
 * Check if Blog array is empty
 * @param {Object} storeData
 */

const isBlogEmpty = async storeData => {
  if (
    storeData.newBlogs === undefined ||
    Object.keys(storeData.newBlogs).length === 0
  ) {
    storeData.blogs = [];
    return storeData;
  }
  storeData.ids = storeData.blogShow
    .map(el => storeData.blogs[el].id)
    .join(",");
  storeData.arr = storeData.blogShow
    .map(el => storeData.blogs[el].handle)
    .join(",");
  return storeData;
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
module.exports.checkBlogs = checkBlogs;
module.exports.isBlogEmpty = isBlogEmpty;
module.exports.checkEmail = checkEmail;
