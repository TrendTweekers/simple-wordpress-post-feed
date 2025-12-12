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

const App = ({ Component, pageProps, shopOrigin, host })=> {
    const router = useRouter();
    const { asPath } = router;
    const app = useAppBridge();

    // Handle App Bridge redirects for client-side navigation
    useEffect(() => {
      if (app) {
        app.subscribe(Redirect.Action.APP, (payload) => {
          router.push(payload.path);
        });
      }
    }, [app, router]);

    const config = {
      apiKey: SHOPIFY_API_KEY,
      host,
      shopOrigin,
      forceRedirect: true,
    };

    return (
      <Provider config={config}>
        <AppBridgeRoutePropagator location={asPath} />
        <ClientRouter />
        <Head>
          <title>Simple Wordpress Post Feed</title>
          <meta charSet="utf-8" />
        </Head>
        <AuthStep config={config} Component={Component} {...pageProps} />
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
