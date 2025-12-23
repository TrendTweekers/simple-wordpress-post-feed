// lib/shopify/sessionTokenClient.js

let _app = null;

function getApiKeyFromMeta() {
  const el = document.querySelector('meta[name="shopify-api-key"]');
  const key = el?.getAttribute("content");
  if (!key) throw new Error("Missing <meta name=\"shopify-api-key\"> tag (API key not found).");
  return key;
}

function getHostFromUrl() {
  const host = new URLSearchParams(window.location.search).get("host");
  if (!host) throw new Error("Missing `host` in URL. App Bridge cannot initialize.");
  return host;
}

export function getAppBridge() {
  if (_app) return _app;

  const ab = window["app-bridge"];
  if (!ab || typeof ab.createApp !== "function") {
    throw new Error("Shopify App Bridge CDN not loaded: window['app-bridge'].createApp is missing.");
  }

  const apiKey = getApiKeyFromMeta();
  const host = getHostFromUrl();

  _app = ab.createApp({
    apiKey,
    host,
    forceRedirect: true,
  });

  return _app;
}

export async function getSessionTokenSafe() {
  // Preferred in App Bridge v4: shopify.idToken()
  if (window.shopify && typeof window.shopify.idToken === "function") {
    const t = await window.shopify.idToken();
    if (t) return t;
  }

  const app = getAppBridge();

  // Newer docs: @shopify/app-bridge/utilities => CDN global usually under window['app-bridge'].utilities
  const ab = window["app-bridge"];
  const utilTokenFn = ab?.utilities?.getSessionToken;
  if (typeof utilTokenFn === "function") {
    const t = await utilTokenFn(app);
    if (t) return t;
  }

  // Older: @shopify/app-bridge-utils => CDN global window['app-bridge-utils']
  const abu = window["app-bridge-utils"];
  const legacyTokenFn = abu?.getSessionToken;
  if (typeof legacyTokenFn === "function") {
    const t = await legacyTokenFn(app);
    if (t) return t;
  }

  throw new Error(
    "Could not obtain Shopify session token. window.shopify.idToken and getSessionToken() are unavailable."
  );
}
