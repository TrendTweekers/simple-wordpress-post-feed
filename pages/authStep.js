import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import { AppProvider, Topbar } from "@shopify/polaris";
import "@shopify/polaris/dist/styles.css";
import Spinner from "../components/SpinnerComponent";
import React, { useState, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import Header from "../components/Header";
import { Provider, Context } from "@shopify/app-bridge-react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";
import { TUNNEL_URL } from "../server/config/config";
import en from "@shopify/polaris/locales/en.json";
import pl from "@shopify/polaris/locales/pl.json";
import sv from "@shopify/polaris/locales/sv.json";
import es from "@shopify/polaris/locales/es.json";

class MyProvider extends React.Component {
  static contextType = Context;

  render() {
    const app = this.context;

    const client = new ApolloClient({
      fetch: authenticatedFetch(app),
      fetchOptions: {
        credentials: "include",
      },
    });

    return (
      <ApolloProvider client={client}>{this.props.children}</ApolloProvider>
    );
  }
}

/**This component is checking if shop is existing in DB having active charge in shopify system... */
const authStep = ({ config, Component, pageProps }) => {
  const { apiKey, shopOrigin } = config;
  const [allowed, setAllowed] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  /**
   * Make install route run and returning if the shop allowed to log in or not, if not, returning an existing confirmation url or a new one
   */
  const makeInstall = () => {
    const action = "install";
    fetch(`${TUNNEL_URL}/api/install?shop=${shopOrigin}&action=${action}`, {
      method: "GET",
      mode: "cors", // no-cors, *cors, same-origin
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
    apiKey: apiKey,
    shopOrigin,
  });

  if (loading) {
    return (
      <AppProvider>
        <Spinner />
      </AppProvider>
    );
  } else {
    if (allowed) {
      return (
        <AppProvider i18n={[en, pl, sv, es]}>
          <MyProvider>
            <Header shop={shopOrigin} />
            <Component {...pageProps} shopOrigin={shopOrigin} />
          </MyProvider>
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
