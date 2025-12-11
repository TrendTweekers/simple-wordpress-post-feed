const { default: Shopify } = require("@shopify/shopify-api");

const { getFs, writeFs } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { initShop } = require("./checkShop");

const { APP } = config;

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 * @param  {string} returnUrl
 * @param  {boolean} getUrl default false if we want to get back the URL and not redirect
 * @param {boolean} webhook default true if we want to make a webhook
 */
const getSubscriptionUrl = async (
  ctx,
  accessToken,
  shop,
  returnUrl,
  getUrl = false,
  webhook = true
) => {
  const settingsData = await getFs("settings", APP);
  const longTrial = settingsData?.longTrial || 0;
  const price = settingsData?.price || 0;

  const query = `mutation {
      appSubscriptionCreate(
          name: "Long Trial"
          returnUrl: "${returnUrl}"
          test: true
          trialDays: ${longTrial}
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: ${price}, currencyCode: USD }
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
  console.log(JSON.stringify(response));
  
  if (!response?.body?.data?.appSubscriptionCreate) {
    throw new Error("Failed to create subscription: " + JSON.stringify(response?.body));
  }
  
  const { confirmationUrl } = response.body.data.appSubscriptionCreate;

  /** Getting the charge ID */
  const chargeID =
    response.body.data.appSubscriptionCreate.appSubscription?.id?.split("/")[4] || null;

  initShop(shop, accessToken, chargeID, confirmationUrl);

  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  writeFs(APP, shop, { longTrial: false });
  return confirmationUrl;
};

module.exports = getSubscriptionUrl;
