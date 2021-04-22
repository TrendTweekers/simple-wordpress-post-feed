import App from "next/app";
import Head from "next/head";
import "@shopify/polaris/dist/styles.css";
import "../styles.scss";
import React from "react";
import {appWithTranslation} from "next-i18next";
import {Provider} from "@shopify/app-bridge-react";

import {SHOPIFY_API_KEY} from "../server/config/config";
import ClientRouter from "../components/ClientRouter";

import AuthStep from "./authStep";

class MyApp extends App {
  render() {
    const {Component, pageProps, shopOrigin} = this.props;
    const config = {apiKey: SHOPIFY_API_KEY, shopOrigin, forceRedirect: true};
    return (
      <Provider config={config}>
        <ClientRouter />
        <Head>
          <title>Simple Wordpress Post Feed</title>
          <meta charSet="utf-8" />
        </Head>
        <AuthStep config={config} Component={Component} {...pageProps} />
      </Provider>
    );
  }
}

MyApp.getInitialProps = async ({ctx}) => {
  return {
    shopOrigin: ctx.query.shop,
  };
};

export default appWithTranslation(MyApp);
