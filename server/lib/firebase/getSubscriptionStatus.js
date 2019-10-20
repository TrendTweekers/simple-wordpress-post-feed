const { getShop } = require("./firebase");

/**
 * Check if there is an active subscription
 * @param {string} collection
 * @param {string} shop
 */
const getSubscriptionStatus = async (collection, shop) => {
  const data = await getShop(collection, shop);
  if (data.status === "ACTIVE") {
    console.log("it appers to be active");
    return true;
  }
  console.log("it appers to NOT be active");
  return false;
};

module.exports = getSubscriptionStatus;
