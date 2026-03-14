const { default: Shopify } = require("@shopify/shopify-api");

const { getFs } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { APP } = config;

const { initShop } = require("./checkShop");

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
  console.log(`[BILLING PATH] REGULAR handler entered for ${shop}`);
  // ✅ IDEMPOTENT BILLING GUARD: Check Shopify first - never charge twice
  const { checkAppSubscription } = require("../lib/shopify/functions");
  const hasActiveSubscription = await checkAppSubscription(shop, accessToken);
  
  if (hasActiveSubscription) {
    console.log(`[BILLING GUARD] Active subscription exists for ${shop} - skipping charge creation`);
    return null; // Return null to indicate no new charge needed
  }
  
  console.log(`[BILLING GUARD] No active subscription found for ${shop} - creating new charge`);
  
  const settingsData = await getFs("settings", APP);
  const trial = settingsData?.trial || 0;
  const price = settingsData?.price || 0;

  const query = `mutation {
      appSubscriptionCreate(
          name: "Recurring charge"
          returnUrl: "${returnUrl}"
          test: false
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
              status
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

  initShop(shop, accessToken, chargeID, confirmationUrl);

  console.log(`[BILLING PATH] REGULAR handler returning confirmationUrl for ${shop}: ${confirmationUrl}`);

  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  return confirmationUrl;
};

module.exports = getSubscriptionUrl;
