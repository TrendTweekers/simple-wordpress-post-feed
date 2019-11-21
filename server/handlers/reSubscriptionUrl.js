const env = require("../config/config");
const { getFs } = require("../lib/firebase/firebase");
const { initShop } = require("./checkShop");
const { TUNNEL_URL, TEST, API_VERSION, APP, HOOK_URL } = env;

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 */
const reSubscriptionUrl = async (accessToken, shop, dev) => {
  const settings = await getFs("settings", APP);

  const query = JSON.stringify({
    query: `mutation {
      appSubscriptionCreate(
          name: "Development Plan"
          returnUrl: "${TUNNEL_URL}"
          test: ${dev}
          trialDays: ${settings.trial}
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: ${settings.price}, currencyCode: USD }
              }
            }
          }
          ]
        ) {
            userErrors {
              field
              message
            }
            confirmationUrl
            appSubscription {
              id
            }
        }
    }`
  });

  const response = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: query
    }
  );

  const responseJson = await response.json();
  const confirmationUrl =
    responseJson.data.appSubscriptionCreate.confirmationUrl;

  const { id } = await responseJson.data.appSubscriptionCreate.appSubscription;
  /**Getting the charge ID */
  const chargeID = id.split("/")[4];

  /**Initialization of the shop without saving the charging plan */
  await initShop(shop, accessToken, chargeID, confirmationUrl);

  return confirmationUrl;
};

module.exports = reSubscriptionUrl;
