import ApolloClient from "apollo-boost";
import { ApolloProvider } from "react-apollo";
import App from "next/app";
import { AppProvider } from "@shopify/polaris";
import { Provider } from "@shopify/app-bridge-react";
import Cookies from "js-cookie";
import "@shopify/polaris/styles.css";
import React from "react";
import Header from "../components/Header";
import { SHOPIFY_API_KEY } from "../server/config/config";
import App2 from "./app2";

const client = new ApolloClient({
  fetchOptions: {
    credentials: "include",
    fetch
  }
});

class MyApp extends App {
  render() {
    const shopOrigin = Cookies.get("shopOrigin");
    const config = {
      apiKey: SHOPIFY_API_KEY,
      shopOrigin,
      forceRedirect: true
    };
    const { Component, pageProps } = this.props;
    console.log(shopOrigin);
    return (
      <App2
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

export default MyApp;
