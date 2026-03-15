import Head from "next/head";
import "@shopify/polaris/build/esm/styles.css";
import "../styles.scss";
import React, { useEffect, useState } from "react";
import { Provider, RoutePropagator as AppBridgeRoutePropagator, useAppBridge, NavigationMenu } from "@shopify/app-bridge-react";
import { useRouter } from "next/router";
import { Redirect } from "@shopify/app-bridge/actions";

import { SHOPIFY_API_KEY } from "../server/config/config";
import ClientRouter from "../components/ClientRouter";
import AuthStep from "../components/authStep";

// Inner component that uses App Bridge hooks - must be inside Provider
const AppBridgeWrapper = ({ asPath, children }) => {
  const router = useRouter();
  const app = useAppBridge();

  // Handle App Bridge redirects for client-side navigation
  useEffect(() => {
    if (app) {
      const unsubscribe = app.subscribe(Redirect.Action.APP, (payload) => {
        router.push(payload.path);
      });
      return () => unsubscribe();
    }
  }, [app, router]);

  return (
    <>
      <AppBridgeRoutePropagator location={asPath} />
      {children}
    </>
  );
};

const App = ({ Component, pageProps, shopOrigin, host })=> {
    const router = useRouter();
    const { asPath, query } = router;
    
    // ✅ SSR FIX: Only render NavigationMenu on client side (prevents "window is not defined" error)
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    // ✅ FIX: Get shop and host from multiple sources (priority order: props > query > pageProps > URL)
    const shop = shopOrigin || query.shop || pageProps?.shop || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shop') : null);

    // ✅ CRITICAL FIX: Ensure host is always extracted from URL search params first (Shopify always sends it there)
    let hostValue = null;

    // Priority 1: Get from URL search params (most reliable - Shopify always puts it there)
    if (typeof window !== 'undefined') {
      hostValue = new URLSearchParams(window.location.search).get('host');
    }

    // Priority 2: Use from props if not in URL (getInitialProps fallback)
    if (!hostValue) {
      hostValue = host || query.host || pageProps?.host;
    }

    // Priority 3: Generate from shop if absolutely needed (fallback)
    if (!hostValue && shop) {
      try {
        hostValue = btoa(`${shop}/admin`);
        console.warn('[App] ⚠️ Generated host from shop (not from Shopify parameter)');
      } catch (e) {
        console.error('[App] Failed to generate host from shop:', e);
      }
    }

    // ✅ CRITICAL: Log host resolution for debugging embedded context
    if (hostValue) {
      console.log('[App] ✅ Host parameter found for Provider:', hostValue.substring(0, 20) + '...');
    } else {
      console.warn('[App] ⚠️ Host parameter missing - App Bridge may not embed correctly');
    }

    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || SHOPIFY_API_KEY || '312f1491e10a2848b3ef63a7cd13e91d';
    
    const config = {
      apiKey: apiKey,
      host: hostValue, // ✅ FIX: Always provide host (even if generated)
      shopOrigin: shop,
      // ✅ FIX: Only force redirect if we're not already on the home page
      // Setting to false prevents App Bridge from redirecting unnecessarily
      forceRedirect: false,
    };

    // ✅ CRITICAL FIX: Verify App Bridge Provider has initialized window.shopify
    useEffect(() => {
      if (typeof window === 'undefined') return;

      // ✅ CRITICAL: window.shopify is set by @shopify/app-bridge-react Provider
      // It's async, so we poll for it instead of trying to use it synchronously
      const checkAppBridge = () => {
        if (!window.shopify) {
          console.warn('[App] ⏳ window.shopify not yet available - Provider initializing');
          return false;
        }

        // Check if idToken function exists (App Bridge v4)
        if (typeof window.shopify.idToken !== 'function') {
          console.warn('[App] ⏳ window.shopify.idToken() not yet available - waiting for Provider');
          return false;
        }

        console.log('[App] ✅ Provider initialized: window.shopify.idToken is available');
        return true;
      };

      // Poll for Provider initialization
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds at 100ms intervals
      const pollInterval = setInterval(() => {
        attempts++;
        if (checkAppBridge()) {
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          console.error('[App] ❌ Provider initialization timeout - window.shopify.idToken still not available after 3 seconds');
          clearInterval(pollInterval);
        }
      }, 100);

      return () => clearInterval(pollInterval);
    }, []);

    return (
      <Provider config={config}>
        <AppBridgeWrapper asPath={asPath}>
          {/* ✅ App Bridge Navigation - adds sidebar icon and navigation menu */}
          {/* ✅ SSR FIX: Only render NavigationMenu on client side (prevents "window is not defined" error) */}
          {isClient && (
            <NavigationMenu
              navigationLinks={[
                {
                  label: 'Dashboard',
                  destination: '/',
                },
                {
                  label: 'Documentation',
                  destination: '/?page=about',
                },
              ]}
              matcher={(link, location) => {
                // Match Dashboard (root path) - default/main page
                if (link.destination === '/' && location.pathname === '/') {
                  // Check if page query param is not set or is 'main'
                  const params = new URLSearchParams(location.search);
                  const pageParam = params.get('page');
                  return !pageParam || pageParam === 'main';
                }
                // Match Documentation page (root path with page=about query param)
                if (link.destination === '/?page=about' && location.pathname === '/') {
                  const params = new URLSearchParams(location.search);
                  return params.get('page') === 'about';
                }
                // Default: exact destination match
                return link.destination === location.pathname;
              }}
            />
          )}
          <ClientRouter />
          <Head>
            <title>Simple Wordpress Post Feed</title>
            <meta charSet="utf-8" />
          </Head>
          <AuthStep config={config} Component={Component} {...pageProps} />
        </AppBridgeWrapper>
      </Provider>
    );
}

// Get props from server - pass shop and host as pageProps
App.getInitialProps = async ({ ctx }) => {
  return {
    shopOrigin: ctx.query?.shop,
    host: ctx.query?.host,
    pageProps: {
      shop: ctx.query?.shop,
      host: ctx.query?.host
    }
  };
};

export default App;
