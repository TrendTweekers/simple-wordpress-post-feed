const { getShop } = require("./firebase");

/**
 * Check if there is an active subscription
 * @param {string} collection
 * @param {string} shop
 * @param {boolean}
 */
const getSubscriptionStatus = async (collection, shop) => {
  const data = await getShop(collection, shop);
  if (data.status === "ACTIVE") {
    console.log("it appers to be active");
    return true;
  }
  console.log("it appers to NOT be active or dev");
  return false;
};

module.exports = getSubscriptionStatus;
