import Head from "next/head";
import "@shopify/polaris/build/esm/styles.css";
import "../styles.scss";
import React, { useEffect } from "react";
import { Provider, RoutePropagator as AppBridgeRoutePropagator, useAppBridge } from "@shopify/app-bridge-react";
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

    const config = {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || SHOPIFY_API_KEY || '312f1491e10a2848b3ef63a7cd13e91d',
      host: hostValue, // ✅ FIX: Always provide host (even if generated)
      shopOrigin: shop,
      forceRedirect: true, // Forces top-level redirects if needed
    };

    return (
      <Provider config={config}>
        <AppBridgeWrapper asPath={asPath}>
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
