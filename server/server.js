/* eslint-disable require-atomic-updates */
import "@babel/polyfill";

import "isomorphic-unfetch";
import { receiveWebhook } from "@shopify/koa-shopify-webhooks";
import Koa from "koa";
import next from "next";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import session from "koa-session";
import serve from "koa-static";
import path from "path";
import { Shopify, ApiVersion } from "@shopify/shopify-api";
// import createShopifyAuth,{verifyRequest}  from "@shopify/koa-shopify-auth";
import { createShopifyAuth, verifyRequest } from "simple-koa-shopify-auth";

import getSubscriptionUrlDEV from "./handlers/getSubscriptionUrlDEV";
import getSubscriptionUrl from "./handlers/getSubscriptionUrl";
import env from "./config/config";
import { getFs } from "./lib/firebase/firebase";
import {
  getData,
  uploadData,
  update,
  deleteAllMeta,
  uninstall,
  redact,
  install,
  customerData,
  customerRedact,
  cancelCharge,
  downloadMetafield,
} from "./routes/";
import { checkDevShop, checkCharge } from "./lib/shopify/functions";

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, APP, TUNNEL_URL } = env;

Shopify.Context.initialize({
  API_KEY: SHOPIFY_API_KEY,
  API_SECRET_KEY: SHOPIFY_API_SECRET_KEY,
  SCOPES: process.env.SCOPES
    ? process.env.SCOPES.split(",")
    : "write_themes,read_themes,read_script_tags,write_script_tags",
  HOST_NAME: TUNNEL_URL.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.January22,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
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
    
    // Global error handler to suppress EPIPE errors (common in web servers)
    server.on('error', (err, ctx) => {
      if (err.code === 'EPIPE') {
        // Client disconnected - ignore this common error
        return;
      }
      // Log other errors normally
      console.error('Server error:', err);
    });
    
    server.proxy = true;
    
    // ✅ MUST BE FIRST: do not let any middleware touch these
    // Handle Next.js static assets, favicon, and static files before ANY other middleware
    server.use(async (ctx, nextFn) => {
      if (
        ctx.path.startsWith("/_next/") ||
        ctx.path === "/favicon.ico" ||
        ctx.path.startsWith("/static/")
      ) {
        ctx.respond = false;
        return handle(ctx.req, ctx.res);
      }
      return nextFn();
    });
    
    server.use(bodyParser());
    // Configure session for cross-site cookie support
    server.use(session({ 
      sameSite: "none",  // Required for cross-site (iframe) cookies
      secure: true,       // Requires HTTPS (Railway handles this)
      httpOnly: true,    // Prevents XSS attacks
      maxAge: 86400000,  // 24 hours
      renew: true        // Renew session on activity
    }, server));
    server.keys = [Shopify.Context.API_SECRET_KEY];
    
    // Serve Next.js static assets (.next/static)
    server.use(serve(path.join(process.cwd(), '.next/static'), {
      maxage: 365 * 24 * 60 * 60 * 1000, // Cache for 1 year
      gzip: true
    }));
    
    // CSP Middleware - Allow iframe embedding from Shopify domains
    server.use(async (ctx, next) => {
      const shop = ctx.query.shop || ctx.request.query.shop; // Fallback for query param
      if (shop) {
        ctx.set('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com;`);
      } else {
        // Secure fallback
        ctx.set('Content-Security-Policy', `frame-ancestors 'none';`);
      }
      await next();
    });
    
    // ✅ REQUIRED: Next.js static assets - MUST BE FIRST ROUTE
    router.get("/_next/(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });
    
    // (Optional but safe) Static assets route
    router.get("/static/(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });
    
    server.use(
      createShopifyAuth({
        accessMode: "offline",
        authRoute: "/install/auth",
        returnHeader: false,
        async afterAuth(ctx) {
          console.log(`after auth ran`);
          const { shop, accessToken } = ctx.state.shopify;
          const { host } = ctx.query;
          if (!accessToken) {
            // This can happen if the browser interferes with the auth flow
            ctx.response.status = 500;
            ctx.response.body = "Failed to get access token! Please try again.";
            return;
          }
          /** Check if its a development shop */
          const isDev = await checkDevShop(shop, accessToken);
          const returnUrl = `https://${Shopify.Context.HOST_NAME}?host=${host}&shop=${shop}`;
          
          // Get subscription URL (billing confirmation) if needed
          let confirmationUrl = null;
          if (isDev) {
            // if not active or development we run the install function
            confirmationUrl = await getSubscriptionUrlDEV(ctx, accessToken, shop, returnUrl, true);
          } else {
            confirmationUrl = await getSubscriptionUrl(ctx, accessToken, shop, returnUrl, true);
          }
          
          // If billing confirmation is needed, redirect to it
          // Otherwise, redirect to Shopify app launcher
          if (confirmationUrl) {
            ctx.redirect(confirmationUrl);
          } else {
            // Redirect to Shopify app launcher to ensure proper embedding
            const appLauncherUrl = `https://${shop}/admin/apps/${SHOPIFY_API_KEY}`;
            ctx.redirect(appLauncherUrl);
          }
        },
      })
    );
    const handleRequest = async (ctx) => {
      // Ensure host and shop are present in query
      const shop = ctx.query.shop;
      const host = ctx.query.host;
      
      if (!shop || !host) {
        console.log('Missing shop or host in handleRequest, redirecting to toplevel auth');
        ctx.redirect(`/auth/toplevel?shop=${shop || ''}&host=${host || ''}`);
        return;
      }
      
      // Attach to request for Next.js to access via ctx.query
      // This ensures Next.js getInitialProps can read these values
      ctx.req.query = { shop, host };
      ctx.req.url = `/?shop=${shop}&host=${host}`;
      
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
    };

    // Handle Shopify embedded app toplevel redirect for OAuth
    router.get("/auth/toplevel", async (ctx) => {
      const { shop, host } = ctx.query;
      if (shop && host) {
        // Return HTML that breaks out of iframe and redirects in top-level window
        const authUrl = `/install/auth?shop=${shop}&host=${host}`;
        ctx.type = 'text/html';
        ctx.body = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting...</title>
        </head>
        <body>
          <script>
            // Break out of iframe and redirect in top-level window
            if (window.top !== window.self) {
              window.top.location.href = '${authUrl}';
            } else {
              window.location.href = '${authUrl}';
            }
          </script>
          <p>Redirecting to authentication...</p>
        </body>
      </html>
    `;
      } else {
        ctx.status = 400;
        ctx.body = "Missing shop or host parameter";
      }
    });

    router.get("/", async (ctx) => {
      const shop = ctx.query.shop;
      const host = ctx.query.host;
      
      // Check if this is an embedded app request (has shop and host)
      if (shop && host) {
        console.log(`Shop from query main page! ${shop}`);
        
        // First, check if there's a valid Shopify session (user is authenticated)
        const shopifySession = ctx.state.shopify;
        if (shopifySession && shopifySession.accessToken) {
          console.log(`Valid Shopify session found for ${shop}, proceeding with app`);
          // User is authenticated via Shopify session, proceed to render app
          await handleRequest(ctx);
          return;
        }
        
        // No Shopify session, check Firebase for existing shop data
        // IMPORTANT: Actually retrieve the data from Firebase first
        let storeDB;
        try {
          storeDB = await getFs(APP, shop);
          console.log(`Firebase query result for ${shop}:`, storeDB ? 'Found' : 'Not found');
        } catch (error) {
          console.error(`Error fetching shop data from Firebase for ${shop}:`, error);
          storeDB = null;
        }
        
        // Check if shop data exists and has required token
        // storeDB can be false (document doesn't exist), null, or undefined
        if (!storeDB || storeDB === false || !storeDB.token) {
          console.log(`No valid shop data found for ${shop} (storeDB: ${JSON.stringify(storeDB)}), redirecting to toplevel auth`);
          // Redirect to toplevel auth to break out of iframe for OAuth
          ctx.redirect(`/auth/toplevel?shop=${shop}&host=${host}`);
          return;
        }
        
        // Shop exists in Firebase with valid token, check if charge is active
        console.log(`Shop data found for ${shop}, checking charge status`);
        const activeCharge = await checkCharge(
          shop,
          storeDB.token,
          storeDB?.chargeID
        );
        
        if (activeCharge) {
          console.log(`Active charge found for ${shop}, rendering app`);
          await handleRequest(ctx);
        } else {
          console.log(`Charge not active for ${shop}, redirecting to toplevel auth`);
          // Redirect to toplevel auth to break out of iframe for OAuth
          ctx.redirect(`/auth/toplevel?shop=${shop}&host=${host}`);
        }
      } else if (shop) {
        // Non-embedded request, handle normally
        console.log(`Non-embedded request for shop: ${shop}`);
        await handleRequest(ctx);
      } else {
        // No shop parameter, handle normally
        await handleRequest(ctx);
      }
    });

    const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });
    router
      .get("/api/data", getData)
      .post("/api/data", uploadData)
      .post("/api/deletedata", deleteAllMeta)
      .get("/api/meta", downloadMetafield)
      .get("/api/install", install)
      .post("/api/update", update)
      .post("/swpf/shop/redact", webhook, redact)
      .post("/swpf/customers/data_request", webhook, customerData)
      .post("/swpf/customers/redact", webhook, customerRedact)
      .post("/swpf/uninstall", webhook, uninstall)
      .post("/api/cancel", cancelCharge);
    
    // GraphQL proxy route
    router.post(
      "/graphql",
      verifyRequest({ returnHeader: true }),
      async (ctx) => {
        await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
      }
    );

    // ✅ MUST BE LAST: Catch-all for Next.js - handles pages, API routes, and any unmatched routes
    router.get("(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });

    // Register all router routes (including catch-all)
    server.use(router.allowedMethods());
    server.use(router.routes());

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => console.log(err));
