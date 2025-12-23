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

  // ✅ FIX: Use App Bridge instance from Provider context instead of creating duplicate
  // This ensures we're using the same instance as _app.js Provider
  const app = useAppBridge();
  
  // Only create redirect if app is available
  const redirect = app ? Redirect.create(app) : null;

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
      console.log(`[AUTH] Calling /api/install for ${shopOrigin}`);
      
      const response = await authenticatedFetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response) {
        // Redirect was triggered by authenticatedFetch (X-Shopify-API-Request-Failure-Reauthorize header)
        console.log(`[AUTH] Redirect triggered by authenticatedFetch`);
        return;
      }
      
      // ✅ FIX: Only redirect on 401/403 if explicitly told to reauth
      // Don't redirect on every 401/403 - backend might be handling it
      if (response.status === 401 || response.status === 403) {
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.log(`[AUTH] Could not parse error response, checking status only`);
          data = {};
        }
        
        const needsReauth = data?.reauth === true || data?.code === "SHOPIFY_AUTH_REQUIRED" || data?.code === "NO_OFFLINE_SESSION";
        
        if (needsReauth && data.reauthUrl) {
          console.log(`[AUTH] Reauth required detected (code: ${data.code}), redirecting to: ${data.reauthUrl}`);
          redirectToAuth(data.reauthUrl);
          return;
        }
        
        // ✅ FIX: Don't redirect on 401/403 if backend didn't explicitly request it
        // The backend SHOP GUARD might be handling auth differently
        console.log(`[AUTH] 401/403 received but no explicit reauth flag, checking if we're already authenticated`);
        
        // If we're on the home page and got 401/403, it might be a false positive
        // Let the backend SHOP GUARD handle it instead of redirecting immediately
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (currentPath === '/' || currentPath === '/index') {
          console.log(`[AUTH] On home page with 401/403 but no reauth flag - backend may handle it, not redirecting`);
          // Don't redirect - let the page render and backend will handle it
          setLoading(false);
          return;
        }
        
        // Only redirect if we're not on home page and got explicit error
        console.log(`[AUTH] Not on home page, using fallback URL`);
        const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : '');
        const fallbackUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || '')}&host=${encodeURIComponent(finalHost)}`;
        redirectToAuth(fallbackUrl);
        return;
      }
      
      const data = await response.json();
      const { allowed: isAllowed, confirmationUrl: confirmUrl, themeAccess } = data;
      
      // Store themeAccess in localStorage or pass to store if needed
      if (themeAccess === false) {
        localStorage.setItem('themeAccess', 'false');
      } else {
        localStorage.removeItem('themeAccess');
      }
      
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
    // ✅ FIX: Only call makeInstall if we have shop and host
    // Prevent unnecessary redirects if parameters are missing
    if (!shopOrigin || !host) {
      console.warn('[AUTH] Missing shop or host, skipping install check');
      setLoading(false);
      return;
    }
    
    makeInstall();
    
    // ✅ FIX: Increase timeout and only redirect if we're still loading AND on home page
    // Don't redirect if we're already on a different page
    const timeout = setTimeout(() => {
      if (!allowed && loading) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        // Only redirect if we're on home page (/) or index
        if (currentPath === '/' || currentPath === '/index') {
          console.warn('[AUTH] Boot timeout - forcing reauth (on home page)');
          const finalHost = host || (shopOrigin ? btoa(`${shopOrigin}/admin`) : '');
          const reauthUrl = `/install/auth?shop=${encodeURIComponent(shopOrigin || '')}&host=${encodeURIComponent(finalHost)}`;
          redirectToAuth(reauthUrl);
        } else {
          console.log('[AUTH] Boot timeout but not on home page, skipping redirect');
          setLoading(false);
        }
      }
    }, 5000); // Increased from 3s to 5s to give backend more time
    
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopOrigin, host]);
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
