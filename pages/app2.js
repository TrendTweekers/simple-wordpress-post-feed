import { ApolloProvider } from "react-apollo";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/styles.css";
import React, { useState, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import Header from "../components/Header";
import { Provider, Context } from "@shopify/app-bridge-react";
import createApp from "@shopify/app-bridge";
import { Redirect, Loading } from "@shopify/app-bridge/actions";
import { TUNNEL_URL } from "../server/config/config";

const App2 = ({
  config,
  client,
  Component,
  pageProps,
  shopOrigin,
  shopifyApiKey
}) => {
  const [allowed, setAllowed] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const makeInstall = () => {
    const action = "install";
    fetch(`${TUNNEL_URL}/api/install?shop=${shopOrigin}&action=${action}`, {
      headers: {
        "Content-Type": "application/json"
      },
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer" // no-referrer, *client
    })
      .then(res => res.json())
      .then(json => {
        console.log(json);
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
    shopOrigin: shopOrigin
  });
  const loadingAction = Loading.create(app);

  if (loading) {
    loadingAction.dispatch(Loading.Action.START);
    return <div>Loading</div>;
  } else {
    if (allowed) {
      loadingAction.dispatch(Loading.Action.STOP);
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
      loadingAction.dispatch(Loading.Action.STOP);
      app.dispatch(
        Redirect.toRemote({
          url: confirmationUrl
        })
      );
      return <div>not allowed</div>;
    }
  }
};

export default App2;
