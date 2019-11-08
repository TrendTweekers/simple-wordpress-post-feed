const { getShop } = require("./firebase");

/**
 * Check if there is an active subscription
 * @param {string} collection
 * @param {string} shop
 * @param {boolean}
 */
const getSubscriptionStatus = async (collection, shop) => {
  const data = await getShop(collection, shop);
  console.log(`shop is active:${data.active}`);
  return data.active;
};

module.exports = getSubscriptionStatus;
