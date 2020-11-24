import ApolloClient from "apollo-boost";
import App from "next/app";
import Cookies from "js-cookie";
import "@shopify/polaris/dist/styles.css";
import React from "react";
import { SHOPIFY_API_KEY } from "../server/config/config";
import AuthStep from "./authStep";
import { appWithTranslation } from "../i18n";

const client = new ApolloClient({
  fetchOptions: {
    credentials: "include",
    fetch,
  },
});

class MyApp extends App {
  render() {
    const shopOrigin = Cookies.get("shopOrigin");
    const config = {
      apiKey: SHOPIFY_API_KEY,
      shopOrigin,
      forceRedirect: true,
    };
    const { Component, pageProps } = this.props;
    return (
      <AuthStep
        config={config}
        client={client}
        Component={Component}
        pageProps={pageProps}
        shopOrigin={shopOrigin}
        shopifyApiKey={SHOPIFY_API_KEY}
      />
    );
  }
}

export default appWithTranslation(MyApp);
