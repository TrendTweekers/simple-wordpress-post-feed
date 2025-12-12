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

    const config = {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || SHOPIFY_API_KEY || '312f1491e10a2848b3ef63a7cd13e91d',
      host: host || query.host,
      shopOrigin: shopOrigin || query.shop,
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

// eslint-disable-next-line require-await
App.getInitialProps = async ({ ctx }) => {
  return {
    shopOrigin: ctx.query.shop,
    host: ctx.query.host,
  };
};

export default App;
