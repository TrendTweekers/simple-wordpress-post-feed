const { default: Shopify } = require("@shopify/shopify-api");

const env = require("../config/config");
const { getFs } = require("../lib/firebase/firebase");

const { initShop } = require("./checkShop");

const { APP } = env;

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 * @param  {string} returnUrl
 * @param  {boolean} getUrl if we want to get back the URL and not redirect, set true
 * @param {boolean} webhook if we want to make a webhook set true
 */
const getSubscriptionUrlDEV = async (
  ctx,
  accessToken,
  shop,
  returnUrl,
  getUrl = false,
  webhook = true
) => {
  const settingsData = await getFs("settings", APP);
  const trial = settingsData?.trial || 0;
  const price = settingsData?.price || 0;

  const query = `mutation {
    appSubscriptionCreate(
        name: "Development Plan(Free - You will not be billed for this test charge!)"
        returnUrl: "${returnUrl}"
        test: true
        trialDays: ${trial}
        lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
                price: { amount: ${price}, currencyCode: USD },
                interval: EVERY_30_DAYS
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
  }`;

  const client = new Shopify.Clients.Graphql(shop, accessToken);
  const response = await client.query({
    data: query,
  });
  
  if (!response?.body?.data?.appSubscriptionCreate) {
    throw new Error("Failed to create subscription: " + JSON.stringify(response?.body));
  }
  
  const { confirmationUrl } = response.body.data.appSubscriptionCreate;

  /** Getting the charge ID */
  const chargeID =
    response.body.data.appSubscriptionCreate.appSubscription?.id?.split("/")[4] || null;

  /** Initialization of the shop without saving the charging plan */
  await initShop(shop, accessToken, chargeID, confirmationUrl);

  /** Creating Uninstall webhook on shopify that will be triggered directly after uninstall */

  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  return confirmationUrl;
};

module.exports = getSubscriptionUrlDEV;
