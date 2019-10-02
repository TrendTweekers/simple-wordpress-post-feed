import "@babel/polyfill";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import graphQLProxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
import getSubscriptionStatus from "./lib/firebase/getSubscriptionStatus";
import { receiveWebhook } from "@shopify/koa-shopify-webhooks";

import { redactRoute } from "./routes/redactRoute";
import { uninstallRoute } from "./routes/uninstallRoute";
import { getRoute } from "./routes/getRoute.js";

const env = require("./config/config");
const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  SCOPES,
  port,
  GRAPHQL_VERSION,
  COLLECTION
} = env;
console.log(ApiVersion);

const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev
});
const handle = app.getRequestHandler();

const getSubscriptionUrl = require("./handlers/getSubscriptionUrl");
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

      async afterAuth(ctx) {
        /**       Auth token and shop available in session
        Redirect to shop upon auth
         *
         */

        const { shop, accessToken } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, {
          httpOnly: false
        });
        /**
         * Check if subscription is active or not in our DB
         */
        const status = await getSubscriptionStatus(COLLECTION, shop);
        if (status === true) {
          // exist
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
  const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });

  router
    .get("/api/data", getRoute)
    .post("/api/redact", webhook, redactRoute)
    .post("/api/uninstall", webhook, uninstallRoute);

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
