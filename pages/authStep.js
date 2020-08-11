import { ApolloProvider } from "react-apollo";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/dist/styles.css";
import React, { useState, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import Header from "../components/Header";
import { Provider, Context } from "@shopify/app-bridge-react";
import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";
import { TUNNEL_URL } from "../server/config/config";

/**This component is checking if shop is existing in DB having active charge in shopify system... */
const authStep = ({
  config,
  client,
  Component,
  pageProps,
  shopOrigin,
  shopifyApiKey,
}) => {
  const [allowed, setAllowed] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  /**
   * Make install route run and returning if the shop allowed to log in or not, if not, returning an existing confirmation url or a new one
   */
  const makeInstall = () => {
    const action = "install";
    fetch(`${TUNNEL_URL}/api/install?shop=${shopOrigin}&action=${action}`, {
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.allowed) {
          setAllowed(true);
          setLoading(false);
        } else {
          setAllowed(false);
          setConfirmationUrl(json.confirmationUrl);
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    makeInstall();
  }, [shopOrigin]);

  const app = createApp({
    apiKey: shopifyApiKey,
    shopOrigin: shopOrigin,
  });

  if (loading) {
    return <div></div>;
  } else {
    if (allowed) {
      return (
        <AppProvider>
          <Provider config={config}>
            <ApolloProvider client={client}>
              <Header />
              <Component {...pageProps} />
            </ApolloProvider>
          </Provider>
        </AppProvider>
      );
    } else {
      /**If charge is not active we redirect them to the confirmation URL */
      app.dispatch(
        Redirect.toRemote({
          url: confirmationUrl,
        })
      );
      return <div>Something went wrong</div>;
    }
  }
};

export default authStep;
