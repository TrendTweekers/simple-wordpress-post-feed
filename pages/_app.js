import ApolloClient from "apollo-boost";
import { ApolloProvider } from "react-apollo";
import App from "next/app";
import { AppProvider } from "@shopify/polaris";
import { Provider } from "@shopify/app-bridge-react";
import Cookies from "js-cookie";
import "@shopify/polaris/styles.css";
import React from "react";
import fetch from "cross-fetch/polyfill";
import Header from "../components/Header.js";

import { SHOPIFY_API_KEY } from "../server/config/config";

const client = new ApolloClient({
  fetchOptions: {
    credentials: "include",
    fetch
  }
});

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    const shopOrigin = Cookies.get("shopOrigin");
    const config = {
      apiKey: SHOPIFY_API_KEY,
      shopOrigin,
      forceRedirect: true
    };
    return (
      <>
        <AppProvider>
          <Provider config={config}>
            <ApolloProvider client={client}>
              <Header />
              <Component {...pageProps} />
            </ApolloProvider>
          </Provider>
        </AppProvider>
      </>
    );
  }
}

export default MyApp;
