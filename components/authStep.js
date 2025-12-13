/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import { AppProvider } from "@shopify/polaris";
import { StoreProvider } from "../store/store";
import React, { useState, useEffect } from "react";
import { useAppBridge, Provider } from "@shopify/app-bridge-react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import en from "@shopify/polaris/locales/en.json";
import pl from "@shopify/polaris/locales/pl.json";
import sv from "@shopify/polaris/locales/sv.json";
import es from "@shopify/polaris/locales/es.json";
import env from "../server/config/config.js";
const { TUNNEL_URL } = env;

import Spinner from "./SpinnerComponent";

const userLoggedInFetch = (app) => {
  const fetchFunction = authenticatedFetch(app);

  return async (uri, options) => {
    const response = await fetchFunction(uri, options);

    if (
      response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1"
    ) {
      const authUrlHeader = response.headers.get(
        "X-Shopify-API-Request-Failure-Reauthorize-Url"
      );

      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, authUrlHeader || `/auth`);
      return null;
    }

    return response;
  };
};

const MyProvider = (props) => {
  const app = useAppBridge();

  const client = new ApolloClient({
    fetch: userLoggedInFetch(app),
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

  // Create App Bridge instance
  const app = createApp({
    apiKey,
    shopOrigin,
    host,
  });

  // Create App Bridge Redirect instance for embedded redirects
  const redirect = Redirect.create(app);

  // Use authenticated fetch from App Bridge (no cookies needed)
  const authenticatedFetch = userLoggedInFetch(app);

  /**
   * Build absolute URL with host parameter preserved
   */
  const buildAuthUrl = (reauthUrl) => {
    // Start with absolute URL
    const url = new URL(reauthUrl, window.location.origin);
    
    // Ensure host exists (Shopify requires it) - get from current URL
    const currentHost = new URLSearchParams(window.location.search).get("host");
    if (!url.searchParams.get("host") && currentHost) {
      url.searchParams.set("host", currentHost);
    }
    
    // Ensure shop parameter exists
    const currentShop = new URLSearchParams(window.location.search).get("shop");
    if (!url.searchParams.get("shop") && currentShop) {
      url.searchParams.set("shop", currentShop);
    }
    
    return url.toString();
  };

  /**
   * Helper function to redirect using App Bridge (works reliably in embedded iframe)
   * Falls back to window.location.assign if App Bridge isn't ready
   */
  const redirectToAuth = (reauthUrl) => {
    // Build absolute URL with host parameter
    const fullUrl = buildAuthUrl(reauthUrl);
    
    console.log(`[AUTH] Redirecting to: ${fullUrl}`);
    
    try {
      // Use App Bridge Redirect for embedded apps
      if (redirect) {
        redirect.dispatch(Redirect.Action.REMOTE, fullUrl);
        console.log(`[AUTH] App Bridge redirect dispatched`);
      } else {
        // Fallback if App Bridge redirect isn't available
        console.warn(`[AUTH] App Bridge redirect not available, using window.location.assign`);
        window.location.assign(fullUrl);
      }
    } catch (err) {
      // Fallback on error
      console.error(`[AUTH] App Bridge redirect failed:`, err);
      window.location.assign(fullUrl);
    }
  };

  /**
   * Make install route run and returning if the shop allowed to log in or not, if not, returning an existing confirmation url or a new one
   * Uses authenticated fetch instead of axios to avoid cookie dependency
   */
  const makeInstall = async () => {
    try {
      const url = `/api/install?shop=${encodeURIComponent(shopOrigin)}&host=${encodeURIComponent(host)}`;
      const response = await authenticatedFetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response) {
        // Redirect was triggered by authenticatedFetch
        return;
      }
      
      // Handle 401/403 or {reauth: true} - Shopify auth required - IMMEDIATE redirect using App Bridge
      if (response.status === 401 || response.status === 403) {
        const data = await response.json();
        const needsReauth = data?.reauth === true || data?.code === "SHOPIFY_AUTH_REQUIRED" || data?.code === "NO_OFFLINE_SESSION";
        
        if (needsReauth && data.reauthUrl) {
          console.log(`[AUTH] Reauth required detected, redirecting to: ${data.reauthUrl}`);
          // Immediate redirect using App Bridge - no spinner, no delay
          redirectToAuth(data.reauthUrl);
          return;
        }
        // Even if code doesn't match, redirect on 401/403
        console.log(`[AUTH] 401/403 without reauth flag, using fallback URL`);
        const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : '');
        const fallbackUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || '')}&host=${encodeURIComponent(finalHost)}`;
        redirectToAuth(fallbackUrl);
        return;
      }
      
      const data = await response.json();
      const { allowed: isAllowed, confirmationUrl: confirmUrl } = data;
      
      if (isAllowed) {
        setAllowed(true);
        setLoading(false);
      } else {
        console.log("not allowed");
        setAllowed(false);
        setConfirmationUrl(`${TUNNEL_URL}${confirmUrl}`);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking install status:', err);
      // On error, force reauth using App Bridge
      const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : '');
      const reauthUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || '')}&host=${encodeURIComponent(finalHost)}`;
      redirectToAuth(reauthUrl);
    }
  };

  useEffect(() => {
    makeInstall();
    
    // Boot timeout failsafe - if app doesn't initialize in 3 seconds, force reauth using App Bridge
    const timeout = setTimeout(() => {
      if (!allowed && loading) {
        console.warn('Boot timeout - forcing reauth');
        const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : '');
        const reauthUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || '')}&host=${encodeURIComponent(finalHost)}`;
        redirectToAuth(reauthUrl);
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopOrigin]);
  // console.log(apiKey, shopOrigin, host);
  if (loading) {
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
            Frame: {
              skipToContent: "Skip to content",
            },
            ContextualSaveBar: {
              save: "Save",
              discard: "Discard",
            },
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
