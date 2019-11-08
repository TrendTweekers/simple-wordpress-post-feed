import "@babel/polyfill";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import graphQLProxy from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
import getSubscriptionStatus from "./lib/firebase/getSubscriptionStatus";
const { checkShop } = require("./handlers/checkShop");
const { checkDevShop } = require("./lib/shopify/functions");

import { uninstallRoute } from "./routes/uninstallRoute";
import { getRoute } from "./routes/getRoute";
import { updateSectionRoute } from "./routes/updateSectionRoute";

const env = require("./config/config");

const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  SCOPES,
  GRAPHQL_VERSION,
  COLLECTION
} = env;
const port = parseInt(process.env.PORT, 10) || 3000;

const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev
});
const handle = app.getRequestHandler();

const getSubscriptionUrl = require("./handlers/getSubscriptionUrl");

app
  .prepare()
  .then(() => {
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
          /** Auth token and shop available in session
           * Redirect to shop upon auth
           */

          const { shop, accessToken } = ctx.session;
          ctx.cookies.set("shopOrigin", shop, {
            httpOnly: false
          });

          /**Check if its a development shop */
          const devShop = await checkDevShop(shop, accessToken);
          /**Check if subscription is active or not in our DB */
          const active = await getSubscriptionStatus(COLLECTION, shop);
          console.log(`${devShop} and ${active}`);
          if (active && !devShop) {
            // exist and not a Development shop
            ctx.redirect("/");
          } else if (devShop) {
            // development shop
            checkShop(shop, accessToken);
            ctx.redirect("/");
          } else {
            //  don't exist so we set it up
            await getSubscriptionUrl(ctx, accessToken, shop);
          }
        }
      })
    );
    server.use(
      graphQLProxy({
        version: GRAPHQL_VERSION
      })
    );

    router
      .get("/api/data", getRoute)
      .get("/api/update", updateSectionRoute)
      /**Delete section route */
      .post("/api/deletesection", uninstallRoute);

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
  })
  .catch(err => console.log(err));
