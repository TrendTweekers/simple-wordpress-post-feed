require("isomorphic-fetch");
const { checkDevShop } = require("./lib/shopify/functions");
const { checkShop } = require("./handlers/checkShop");
const { default: createShopifyAuth } = require("@shopify/koa-shopify-auth");
const { default: graphQLProxy } = require("@shopify/koa-shopify-graphql-proxy");
const { getData } = require("./routes/getData");
const { getFs } = require("./lib/firebase/firebase");
const { update } = require("./routes/update");
const { verifyRequest } = require("@shopify/koa-shopify-auth");
const env = require("./config/config");
const getSubscriptionUrl = require("./handlers/getSubscriptionUrl");
const Koa = require("koa");
const next = require("next");
const Router = require("koa-router");
const session = require("koa-session");

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
        const storeDB = await getFs(APP, shop);

        if (storeDB) {
          // store is active
          if (storeDB.development === false) {
            return ctx.redirect("/");
          } else {
            // confirm store is still in development
            const isDev = await checkDevShop(shop, accessToken);
            if (isDev === true) {
              return ctx.redirect("/");
            }
          }
        }
        // if not active or development we run the install function
        await getSubscriptionUrl(ctx, accessToken, shop);
      }
    })
  );
  server.use(graphQLProxy({ version: GRAPHQL_VERSION }));

  router.get("/api/data", getData).get("/api/update", update);

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
