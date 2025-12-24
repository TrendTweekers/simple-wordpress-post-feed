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
    
    // ✅ FIX: Ensure host is valid - generate if missing but shop exists
    let hostValue = host || query.host || pageProps?.host;
    if (!hostValue && typeof window !== 'undefined') {
      hostValue = new URLSearchParams(window.location.search).get('host');
    }
    // ✅ FIX: Generate host from shop if still missing (required for App Bridge embedding)
    if (!hostValue && shop) {
      try {
        hostValue = btoa(`${shop}/admin`);
      } catch (e) {
        console.error('[App] Failed to generate host from shop:', e);
      }
    }

    // ✅ FIX: Validate host is present before initializing App Bridge
    if (!hostValue) {
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

    // ✅ CRITICAL: Global fetch interceptor to verify App Bridge v4 token exchange
    useEffect(() => {
      if (typeof window === 'undefined') return;
      
      // Wait for App Bridge to initialize
      const checkAppBridge = () => {
        if (!window.shopify) {
          console.warn('[App] ⚠️ window.shopify not available - App Bridge may not be loaded');
          return;
        }
        
        // Check if idToken function exists (App Bridge v4)
        if (typeof window.shopify.idToken !== 'function') {
          console.warn('[App] ⚠️ window.shopify.idToken() not available - App Bridge v4 token exchange may fail');
          return;
        }
        
        // Test idToken retrieval
        try {
          const token = window.shopify.idToken();
          if (token) {
            console.log('[App] ✅ App Bridge v4 idToken available:', token.substring(0, 20) + '...');
          } else {
            console.warn('[App] ⚠️ App Bridge idToken() returned null - token exchange may fail');
          }
        } catch (err) {
          console.error('[App] ❌ Error getting App Bridge idToken:', err);
        }
      };
      
      // Check immediately and after a short delay (App Bridge may load async)
      checkAppBridge();
      const timeout = setTimeout(checkAppBridge, 500);
      
      return () => clearTimeout(timeout);
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
