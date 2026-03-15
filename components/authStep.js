/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import { AppProvider } from "@shopify/polaris";
import { StoreProvider } from "../store/store";
import React, { useState, useEffect } from "react";
import { useAppBridge, Provider } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { manualTokenFetch } from "../lib/manualTokenFetch";
import en from "@shopify/polaris/locales/en.json";
import pl from "@shopify/polaris/locales/pl.json";
import sv from "@shopify/polaris/locales/sv.json";
import es from "@shopify/polaris/locales/es.json";
import env from "../server/config/config.js";
const { TUNNEL_URL } = env;

import Spinner from "./SpinnerComponent";

// ✅ v3 PATTERN: MyProvider creates ApolloClient using getSessionToken(app) for each request
const MyProvider = (props) => {
  const app = useAppBridge();

  const client = new ApolloClient({
    // ✅ FIX: Custom fetch that gets a fresh session token per request (App Bridge v3)
    fetch: async (url, options = {}) => {
      try {
        const token = await getSessionToken(app);
        return fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
      } catch (err) {
        console.error("[MyProvider] Failed to get session token for Apollo:", err);
        // Fall back to unauthenticated fetch rather than throwing — lets Apollo show its own error
        return fetch(url, { ...options, credentials: "include" });
      }
    },
    fetchOptions: {
      credentials: "include",
    },
  });

  const Component = props.Component;

  return (
    <ApolloProvider client={client}>
      <Component {...props} />
    </ApolloProvider>
  );
};

/** This component is checking if shop is existing in DB having active charge in shopify system... */
const authStep = ({ config, Component, pageProps }) => {
  const { apiKey, shopOrigin, host } = config;
  const [allowed, setAllowed] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ v3 PATTERN: Get app instance from Provider context
  const app = useAppBridge();
  const redirect = app ? Redirect.create(app) : null;

  /**
   * Build absolute URL with host + shop parameters preserved
   */
  const buildAuthUrl = (reauthUrl) => {
    const url = new URL(reauthUrl, window.location.origin);
    const currentHost = new URLSearchParams(window.location.search).get("host");
    if (!url.searchParams.get("host") && currentHost) {
      url.searchParams.set("host", currentHost);
    }
    const currentShop = new URLSearchParams(window.location.search).get("shop");
    if (!url.searchParams.get("shop") && currentShop) {
      url.searchParams.set("shop", currentShop);
    }
    return url.toString();
  };

  /**
   * Redirect via App Bridge (embedded-safe), fallback to window.location.assign
   */
  const redirectToAuth = (reauthUrl) => {
    const fullUrl = buildAuthUrl(reauthUrl);
    console.log(`[AUTH] Redirecting to: ${fullUrl}`);
    try {
      if (redirect) {
        redirect.dispatch(Redirect.Action.REMOTE, fullUrl);
        console.log(`[AUTH] App Bridge redirect dispatched`);
      } else {
        console.warn(`[AUTH] App Bridge redirect not available, using window.location.assign`);
        window.location.assign(fullUrl);
      }
    } catch (err) {
      console.error(`[AUTH] App Bridge redirect failed:`, err);
      window.location.assign(fullUrl);
    }
  };

  /**
   * Check install/billing status.
   * ✅ v3 PATTERN: getSessionToken(app) → manualTokenFetch
   * No window.shopify, no authenticatedFetch, no getSessionTokenSafe.
   */
  const makeInstall = async () => {
    try {
      const url = `/api/install?shop=${encodeURIComponent(shopOrigin)}&host=${encodeURIComponent(host)}`;
      console.log(`[AUTH] Calling /api/install for ${shopOrigin}`);

      // ✅ CRITICAL: Get token via App Bridge v3 — getSessionToken(app)
      let token;
      try {
        token = await getSessionToken(app);
      } catch (err) {
        console.error("[AUTH] getSessionToken failed:", err.message);
        // No token — fall through to unauthenticated request so the server can respond
      }

      let response;
      if (token) {
        response = await manualTokenFetch(url, token, { method: "GET" });
      } else {
        console.warn("[AUTH] No token available, attempting unauthenticated install check");
        response = await fetch(url, { method: "GET", credentials: "include" });
      }

      if (!response) {
        console.log(`[AUTH] Response was null (reauth redirect triggered)`);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        let data = {};
        try { data = await response.json(); } catch (_) {}

        const needsReauth =
          data?.reauth === true ||
          data?.code === "SHOPIFY_AUTH_REQUIRED" ||
          data?.code === "NO_OFFLINE_SESSION";

        if (needsReauth && data.reauthUrl) {
          console.log(`[AUTH] Reauth required (code: ${data.code}), redirecting`);
          redirectToAuth(data.reauthUrl);
          return;
        }

        // 401/403 without explicit reauth flag — stay on page, let backend handle
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        if (currentPath === "/" || currentPath === "/index") {
          console.log(`[AUTH] 401/403 on home page with no reauth flag — not redirecting`);
          setLoading(false);
          return;
        }

        const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : "");
        const fallbackUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || "")}&host=${encodeURIComponent(finalHost)}`;
        redirectToAuth(fallbackUrl);
        return;
      }

      const data = await response.json();
      const { allowed: isAllowed, confirmationUrl: confirmUrl, themeAccess } = data;

      if (themeAccess === false) {
        localStorage.setItem("themeAccess", "false");
      } else {
        localStorage.removeItem("themeAccess");
      }

      if (isAllowed) {
        setAllowed(true);
        setLoading(false);
        console.log("[AUTH] ✅ Shop allowed — rendering app UI");
      } else {
        console.log("[AUTH] ⚠️ Shop not allowed — billing may be pending");
        setAllowed(true);
        setLoading(false);
        if (confirmUrl) {
          setConfirmationUrl(`${TUNNEL_URL}${confirmUrl}`);
          console.log("[AUTH] Billing confirmation URL available:", confirmUrl);
        }
      }
    } catch (err) {
      console.error("Error checking install status:", err);
      const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : "");
      const reauthUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || "")}&host=${encodeURIComponent(finalHost)}`;
      redirectToAuth(reauthUrl);
    }
  };

  useEffect(() => {
    if (!shopOrigin || !host) {
      console.warn("[AUTH] Missing shop or host, skipping install check");
      setLoading(false);
      setAllowed(true);
      return;
    }

    // ✅ CRITICAL: Render UI immediately — billing check is non-blocking
    setLoading(false);
    setAllowed(true);

    makeInstall().catch((err) => {
      console.error("[AUTH] Billing check failed:", err);
    });

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("[AUTH] ⚠️ Billing check timeout — rendering UI anyway");
        setLoading(false);
        setAllowed(true);
      }
    }, 2000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopOrigin, host]);

  if (loading && !shopOrigin && !host) {
    return (
      <AppProvider>
        <Spinner />
      </AppProvider>
    );
  }

  if (allowed) {
    return (
      <AppProvider
        i18n={{
          Polaris: {
            Frame: { skipToContent: "Skip to content" },
            ContextualSaveBar: { save: "Save", discard: "Discard" },
          },
          translations: [en, pl, sv, es],
        }}
      >
        <Provider config={config}>
          <StoreProvider>
            <MyProvider
              Component={Component}
              {...pageProps}
              shopOrigin={shopOrigin}
              host={host}
            />
          </StoreProvider>
        </Provider>
      </AppProvider>
    );
  } else {
    /** If charge is not active we redirect them to the confirmation URL */
    app.dispatch(
      Redirect.toRemote({
        url: `${confirmationUrl}`,
      })
    );
  }
};

export default authStep;
