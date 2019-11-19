require("isomorphic-unfetch");
const { checkDevShop, checkCharge } = require("./lib/shopify/functions");
const { checkShop } = require("./handlers/checkShop");
const { default: createShopifyAuth } = require("@shopify/koa-shopify-auth");
const { default: graphQLProxy } = require("@shopify/koa-shopify-graphql-proxy");
const { getData, update, uninstall, redact, install } = require("./routes/");
const { getFs } = require("./lib/firebase/firebase");
const { verifyRequest } = require("@shopify/koa-shopify-auth");
const { receiveWebhook } = require("@shopify/koa-shopify-webhooks");
const env = require("./config/config");
const getSubscriptionUrl = require("./handlers/getSubscriptionUrl");
const getSubscriptionUrlDEV = require("./handlers/getSubscriptionUrlDEV");
const Koa = require("koa");
const next = require("next");
const Router = require("koa-router");
const session = require("koa-session");
var bodyParser = require("koa-bodyparser");

const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  SCOPES,
  GRAPHQL_VERSION,
  APP
} = env;

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = new Koa();
  const router = new Router();
  server.use(bodyParser());
  server.use(session(server));
  server.keys = [SHOPIFY_API_SECRET_KEY];
  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: SCOPES,
      accessMode: "offline",

      async afterAuth(ctx) {
        // runs when session data is not available
        console.log("afterAuth");
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, {
          httpOnly: false
        });

        // Check if customer exist  and route according to it
        const isDev = await checkDevShop(shop, accessToken);
        const storeDB = await getFs(APP, shop);
        console.log(accessToken);
        if (isDev) {
          // if not active or development we run the install function
          await getSubscriptionUrlDEV(ctx, accessToken, shop);
        } else {
          await getSubscriptionUrl(ctx, accessToken, shop);
        }
      }
    })
  );
  server.use(graphQLProxy({ version: GRAPHQL_VERSION }));
  const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });
  router
    .get("/api/data", getData)
    .get("/api/install", install)
    .post("/api/update", update)
    .post("/swpf/uninstall", webhook, uninstall)
    .post("/swpf/redact", webhook, redact);

  router.get("*", verifyRequest(), async ctx => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });

  server.use(router.allowedMethods());
  server.use(router.routes());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
