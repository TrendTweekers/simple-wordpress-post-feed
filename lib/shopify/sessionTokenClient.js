// lib/shopify/sessionTokenClient.js
// ⚠️  DEPRECATED — do not use.
// This file used window.shopify.idToken() (App Bridge v4 global) and window["app-bridge"] CDN globals.
// Neither exists in App Bridge v3.4.3.
//
// Use the correct v3 pattern in your React component:
//   import { getSessionToken } from "@shopify/app-bridge-utils";
//   import { useAppBridge } from "@shopify/app-bridge-react";
//   const app = useAppBridge();
//   const token = await getSessionToken(app);
//   const response = await manualTokenFetch(url, token, options);

export async function getSessionTokenSafe() {
  throw new Error(
    "getSessionTokenSafe() is deprecated. It relied on window.shopify.idToken (App Bridge v4 only).\n" +
    "Use getSessionToken(app) from @shopify/app-bridge-utils in your React component instead."
  );
}

export function getAppBridge() {
  throw new Error(
    "getAppBridge() is deprecated. It relied on window['app-bridge'] CDN globals.\n" +
    "Use useAppBridge() from @shopify/app-bridge-react in your React component instead."
  );
}
