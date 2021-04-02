require("isomorphic-unfetch");
const { checkDevShop, checkCharge } = require("./lib/shopify/functions");
const { default: graphQLProxy } = require("@shopify/koa-shopify-graphql-proxy");
const {
  getData,
  update,
  uninstall,
  redact,
  install,
  customerData,
  customerRedact
} = require("./routes/");
const { getFs } = require("./lib/firebase/firebase");
const { verifyRequest } = require("@shopify/koa-shopify-auth");
const { receiveWebhook } = require("@shopify/koa-shopify-webhooks");
const env = require("./config/config");
const getSubscriptionUrl = require("./handlers/getSubscriptionUrl");
const getSubscriptionUrlDEV = require("./handlers/getSubscriptionUrlDEV");
const Koa = require("koa");
const next = require("next");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");
const session = require("koa-session");
const { default: Shopify, ApiVersion } = require("@shopify/shopify-api");
const { default: createShopifyAuth } = require("@shopify/koa-shopify-auth");

const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  SCOPES,
  GRAPHQL_VERSION,
  APP,
  TUNNEL_URL
} = env;

Shopify.Context.initialize({
  API_KEY: SHOPIFY_API_KEY,
  API_SECRET_KEY: SHOPIFY_API_SECRET_KEY,
  SCOPES: SCOPES,
  HOST_NAME: TUNNEL_URL.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.April21,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage()
});

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = new Koa();
    const router = new Router();
    server.proxy = true;
    server.use(bodyParser());
    server.use(session({ sameSite: "none", secure: true }, server));
    server.keys = [Shopify.Context.API_SECRET_KEY];
    server.use(
      createShopifyAuth({
        accessMode: "offline",
        async afterAuth(ctx) {
          console.log(`after auth ran`);
          const { shop, scope, accessToken } = ctx.state.shopify;

          /** Check if its a development shop */
          const isDev = await checkDevShop(shop, accessToken);
          const returnUrl = `https://${Shopify.Context.HOST_NAME}?shop=${shop}`;
          if (isDev) {
            // if not active or development we run the install function
            await getSubscriptionUrlDEV(ctx, accessToken, shop, returnUrl);
          } else {
            await getSubscriptionUrl(ctx, accessToken, shop, returnUrl);
          }
        }
      })
    );
    const handleRequest = async (ctx) => {
      console.log(`handle request ran ${JSON.stringify(ctx.request.url)}`)
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
      ctx.res.statusCode = 200;
    };

    router.get("/", async (ctx) => {
      const shop = ctx.query.shop;
      if (shop) {
        console.log(`Shop from query main page! ${shop}`);
        const storeDB = await getFs(APP, shop);
        if (!storeDB) {
          ctx.redirect(`/auth?shop=${shop}`);
        } else {
          await handleRequest(ctx);
        }
      }
    });
    router.get("/about", async (ctx) => {
      const shop = ctx.query.shop;

      if (shop) {
        console.log(`Shop from query about page! ${shop}`);
        const storeDB = await getFs(APP, shop);
        if (!storeDB) {
          ctx.redirect(`/auth?shop=${shop}`);
        } else {
          await handleRequest(ctx);
        }
      }
    });

    const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });
    router
      .get("/api/data", getData)
      .get("/api/install", install)
      .post("/api/update", update)
      .post("/swpf/shop/redact", webhook, redact)
      .post("/swpf/customers/data_request", webhook, customerData)
      .post("/swpf/customers/redact", webhook, customerRedact)
      .post("/swpf/uninstall", webhook,uninstall);

    router.get("(/_next/static/.*)", handleRequest);  // Static content is clear
    router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
    router.get("(.*)", verifyRequest(), handleRequest); // Everything else must have sessions

    server.use(router.allowedMethods());
    server.use(router.routes());
    router.post(
      "/graphql",
      verifyRequest({ returnHeader: true }),
      async (ctx, next) => {
        await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
      }
    );

    server.use(router.routes());

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => console.log(err));
