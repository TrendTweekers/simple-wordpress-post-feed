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
import mount from "koa-mount";
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
import { checkDevShop, checkCharge, checkAppSubscription } from "./lib/shopify/functions";

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

// Boot check: verify session storage is available after initialization
const { getSessionStorageSafe } = require("./lib/shopify/shopify");
const shopifyApi = Shopify; // The initialized Shopify instance
const storage = getSessionStorageSafe(shopifyApi);
console.log("[SESSION STORAGE] Boot check: active =", storage ? "OK" : "MISSING");
if (storage) {
  console.log("[SESSION STORAGE] Boot check: loadSession =", typeof storage.loadSession);
  console.log("[SESSION STORAGE] Boot check: deleteSession =", typeof storage.deleteSession);
}

const port = parseInt(process.env.PORT, 10) || 3000;
// Force production mode - don't rely on NODE_ENV (prevents "assets exist but Next still 404s" bugs)
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    // Runtime sanity checks - verify .next directory exists
    const fs = require("fs");
    console.log("HAS .next:", fs.existsSync(".next"));
    console.log("HAS .next/static:", fs.existsSync(".next/static"));
    console.log("HAS .next/static/chunks:", fs.existsSync(".next/static/chunks"));
    
    // Proof logs - verify BUILD_ID and chunks
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    console.log("BUILD_ID exists:", fs.existsSync(buildIdPath));
    if (fs.existsSync(buildIdPath)) {
      console.log("BUILD_ID:", fs.readFileSync(buildIdPath, "utf8").trim());
    }
    console.log("chunks count:", fs.existsSync(".next/static/chunks") ? fs.readdirSync(".next/static/chunks").length : 0);
    
    // Runtime debug log - check static chunks directories
    const chunksPath = path.join(process.cwd(), ".next/static/chunks");
    const standaloneChunksPath = path.join(process.cwd(), ".next/standalone/.next/static/chunks");
    console.log(`\n=== Static Chunks Debug ===`);
    console.log(`Regular chunks path exists: ${fs.existsSync(chunksPath)}`);
    if (fs.existsSync(chunksPath)) {
      const files = fs.readdirSync(chunksPath).slice(0, 30);
      console.log(`Regular chunks files (first 30):`, files);
    }
    console.log(`Standalone chunks path exists: ${fs.existsSync(standaloneChunksPath)}`);
    if (fs.existsSync(standaloneChunksPath)) {
      const files = fs.readdirSync(standaloneChunksPath).slice(0, 30);
      console.log(`Standalone chunks files (first 30):`, files);
    }
    console.log(`process.cwd():`, process.cwd());
    console.log(`===========================\n`);
    
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
    
    console.log("✅ _next middleware mounted in", __filename);
    console.log("✅ Custom Koa server starting - auth routes will be handled by Koa, not Next.js");
    
    // ✅ CRITICAL: Create Shopify auth middleware FIRST (required for hard intercept below)
    const shopifyAuthMiddleware = createShopifyAuth({
      accessMode: "offline",
      authPath: "/install/auth",
      authCallbackPath: "/install/auth/callback",
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
          
          // ✅ IDEMPOTENT BILLING GUARD: Check Shopify first before creating subscription
          const hasActiveSubscription = await checkAppSubscription(shop, accessToken);
          
          if (hasActiveSubscription) {
            console.log(`[BILLING GUARD] Active subscription exists for ${shop} after OAuth - skipping charge creation`);
            // Redirect to Shopify app launcher - no billing needed
            const appLauncherUrl = `https://${shop}/admin/apps/${SHOPIFY_API_KEY}`;
            ctx.redirect(appLauncherUrl);
            return;
          }
          
          console.log(`[BILLING GUARD] No active subscription found for ${shop} after OAuth - creating charge`);
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
      });
    
    // ✅ HARD INTERCEPT: Normalize path and intercept /install/auth routes BEFORE EVERYTHING
    // This ensures these routes NEVER reach Next.js, router, or any other middleware
    server.use(async (ctx, next) => {
      // Normalize path by stripping trailing slashes
      const p = ctx.path.replace(/\/+$/, "");
      
      // Hard intercept: if normalized path matches auth routes, return auth middleware with noop next
      if (p === "/install/auth" || p === "/install/auth/callback") {
        console.log("[AUTH-GUARD] intercept", ctx.method, ctx.path, ctx.querystring);
        // Normalize ctx.path for auth middleware
        ctx.path = p;
        // Return auth middleware with noop next to prevent fallthrough
        return shopifyAuthMiddleware(ctx, async () => {});
      }
      return next();
    });
    
    // ✅ REQUIRED: Body parser and session MUST be before Shopify auth middleware
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
    
    // Mount auth middleware normally (handles other auth-related routes)
    server.use(shopifyAuthMiddleware);
    
    // ✅ EARLY LOGGER: Track ALL /install/auth requests
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/install/auth")) {
        console.log(`[EARLY LOG] ${ctx.method} ${ctx.path} - shop=${ctx.query.shop || 'none'}, host=${ctx.query.host || 'none'}`);
      }
      await next();
    });
    
    // Serve static assets with koa-static + koa-mount - MUST be ABSOLUTE FIRST middleware
    const nextStaticPath = path.join(process.cwd(), ".next", "static");
    
    // Logging middleware for /_next/static requests (before static serving)
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/_next/static")) {
        const filePath = path.join(nextStaticPath, ctx.path.replace("/_next/static/", ""));
        console.log(`[_next/static] ${ctx.method} ${ctx.path} -> ${filePath}`);
        await next();
        console.log(`[_next/static] ${ctx.method} ${ctx.path} -> status: ${ctx.status}`);
        return;
      }
      await next();
    });
    
    // Static serving middleware - MUST be before any other /_next handling
    server.use(
      mount(
        "/_next/static",
        serve(nextStaticPath, {
          maxage: 365 * 24 * 60 * 60 * 1000,
          gzip: true,
        })
      )
    );
    
    // Let Next handle other _next paths (not /_next/static) and favicon
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/_next/static")) {
        // Should never reach here if static middleware works
        console.warn(`[_next/static] WARNING: Request not handled by static middleware: ${ctx.path}`);
        return next();
      }
      if (ctx.path.startsWith("/_next/") || ctx.path === "/favicon.ico") {
        ctx.respond = false;
        await handle(ctx.req, ctx.res);
        return;
      }
      await next();
    });
    
    // Only enforce shop/host for HTML document requests, never for assets
    server.use(async (ctx, next) => {
      const isDocument =
        ctx.method === "GET" &&
        (ctx.get("sec-fetch-dest") === "document" || ctx.accepts("html"));
      
      // Only protect the main HTML page render
      if (isDocument && !ctx.query.shop && !ctx.query.host) {
        ctx.status = 400;
        ctx.body = "Open this app from Shopify Admin (missing shop/host).";
        return;
      }
      
      await next();
    });
    
    // CSP Middleware - Allow iframe embedding from Shopify domains
    // Wrap to skip _next and favicon (prevents accidental ordering mistakes)
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/_next/") || ctx.path === "/favicon.ico") {
        return next();
      }
      
      const shop = ctx.query.shop || ctx.request.query.shop; // Fallback for query param
      if (shop) {
        ctx.set('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com;`);
      } else {
        // Secure fallback
        ctx.set('Content-Security-Policy', `frame-ancestors 'none';`);
      }
      await next();
    });
    
    // ✅ PATH NORMALIZATION: Remove trailing slashes (except root and auth routes)
    // Auth routes are already handled by hard guard above, so skip them here
    server.use(async (ctx, next) => {
      // Skip auth routes - they're already handled by hard guard
      if (ctx.path === "/install/auth" || ctx.path === "/install/auth/" || 
          ctx.path === "/install/auth/callback" || ctx.path === "/install/auth/callback/") {
        return next();
      }
      // Normalize: remove trailing slash if path length > 1 (preserve root "/")
      if (ctx.path.length > 1 && ctx.path.endsWith("/")) {
        ctx.path = ctx.path.slice(0, -1);
      }
      await next();
    });
    
    // ✅ CRITICAL: Logging middleware for /install/auth - track all auth requests
    server.use(async (ctx, next) => {
      if (ctx.path === "/install/auth" || ctx.path.startsWith("/install/auth")) {
        console.log(`[AUTH] /install/auth hit: method=${ctx.method}, path=${ctx.path}, shop=${ctx.query.shop}, host=${ctx.query.host}`);
        const startTime = Date.now();
        await next();
        const duration = Date.now() - startTime;
        console.log(`[AUTH] /install/auth response: status=${ctx.status}, Location=${ctx.response.get('Location') || 'none'}, duration=${duration}ms`);
        return;
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
    const handleRequest = async (ctx) => {
      // Attach shop and host to request for Next.js to access via ctx.query
      const shop = ctx.query.shop;
      const host = ctx.query.host;
      
      if (shop && host) {
        ctx.req.query = { shop, host };
        ctx.req.url = `/?shop=${shop}&host=${host}`;
      }
      
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
    };

    // Handle Shopify embedded app toplevel redirect for OAuth
    router.get("/auth/toplevel", async (ctx) => {
      const { shop, host } = ctx.query;
      const { ensureHost } = require("./lib/shopify/host");
      
      if (!shop) {
        ctx.status = 400;
        ctx.body = "Missing shop parameter";
        return;
      }
      
      // Ensure host is present (generate if missing)
      const finalHost = ensureHost(shop, host);
      const authUrl = `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`;
      
      // Return HTML that breaks out of iframe and redirects in top-level window
      ctx.type = 'text/html';
      ctx.body = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
<script>
  (function () {
    var url = ${JSON.stringify(authUrl)};
    if (window.top) window.top.location.href = url;
    else window.location.href = url;
  })();
</script>
Redirecting…
</body></html>`;
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
          const { ensureHost } = require("./lib/shopify/host");
          const finalHost = ensureHost(shop, host);
          ctx.redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
          return;
        }
        
        // Shop exists in Firebase with valid token, check if charge is active
        console.log(`Shop data found for ${shop}, checking charge status`);
        
        // ✅ Use checkAppSubscription (GraphQL) as source of truth - works even after re-auth
        let activeCharge = false;
        try {
          activeCharge = await checkAppSubscription(shop, storeDB.token);
          if (!activeCharge && storeDB?.chargeID) {
            // Fallback to REST API check for legacy charges
            activeCharge = await checkCharge(shop, storeDB.token, storeDB.chargeID);
          }
        } catch (err) {
          // If checkAppSubscription fails with auth error, redirect to reauth
          if (err.isAxiosError || (err.response && (err.response.status === 401 || err.response.status === 403))) {
            console.log(`Auth error checking charge for ${shop}, redirecting to toplevel auth`);
            const { ensureHost } = require("./lib/shopify/host");
            const finalHost = ensureHost(shop, host);
            ctx.redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
            return;
          }
          // Otherwise, try legacy checkCharge if chargeID exists
          if (storeDB?.chargeID) {
            activeCharge = await checkCharge(shop, storeDB.token, storeDB.chargeID);
          }
        }
        
        if (activeCharge) {
          console.log(`Active charge found for ${shop}, rendering app`);
          await handleRequest(ctx);
        } else {
          console.log(`Charge not active for ${shop}, redirecting to toplevel auth`);
          // Redirect to toplevel auth to break out of iframe for OAuth
          const { ensureHost } = require("./lib/shopify/host");
          const finalHost = ensureHost(shop, host);
          ctx.redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
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
    // /install/auth and /install/auth/callback are handled by hard route guard above
    router.get("(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });

    // ✅ CRITICAL ORDERING: Register router routes BEFORE Next.js catch-all
    // Router routes must be registered first so they take precedence
    server.use(router.routes());
    server.use(router.allowedMethods());
    
    // ✅ FINAL: Next.js catch-all - only handles unmatched routes
    // /install/auth and /install/auth/callback are handled by hard route guard above
    server.use(async (ctx) => {
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
    });

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => console.log(err));
