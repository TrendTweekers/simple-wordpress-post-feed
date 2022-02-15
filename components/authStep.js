/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import {ApolloProvider} from "react-apollo";
import ApolloClient from "apollo-boost";
import {AppProvider} from "@shopify/polaris";
import {StoreProvider} from '../store/store';
import React, {useState, useEffect} from "react";
import fetch from "isomorphic-unfetch";
import {useAppBridge, Provider} from "@shopify/app-bridge-react";
import {authenticatedFetch} from "@shopify/app-bridge-utils";
import {Redirect} from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import en from "@shopify/polaris/locales/en.json";
import pl from "@shopify/polaris/locales/pl.json";
import sv from "@shopify/polaris/locales/sv.json";
import es from "@shopify/polaris/locales/es.json";


import Spinner from "./SpinnerComponent";

const userLoggedInFetch = (app) => {
  const fetchFunction = authenticatedFetch(app);

  return async (uri, options) => {
    const response = await fetchFunction(uri, options);

    if (
      response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1"
    ) {
      const authUrlHeader = response.headers.get(
        "X-Shopify-API-Request-Failure-Reauthorize-Url",
      );

      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, authUrlHeader || `/auth`);
      return null;
    }

    return response;
  };
};

const MyProvider = (props) => {
  const app = useAppBridge();

  const client = new ApolloClient({
    fetch: userLoggedInFetch(app),
    fetchOptions: {
      credentials: "include",
    },
  });
  const Component = props.Component;

  return (
    <ApolloProvider client={client}>
      <Component {...props} />
    </ApolloProvider>
  );
};

/** This component is checking if shop is existing in DB having active charge in shopify system... */
const authStep = ({config, Component, pageProps}) => {
  const {apiKey, shopOrigin, host} = config;
  const [allowed, setAllowed] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState("");
  const [loading, setLoading] = useState(true);

  /**
   * Make install route run and returning if the shop allowed to log in or not, if not, returning an existing confirmation url or a new one
   */
  const makeInstall = () => {
    const action = "install";
    fetch(`/api/install?shop=${shopOrigin}&host=${host}`, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      referrer: "no-referrer",
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
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    makeInstall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopOrigin]);

  const app = createApp({
    apiKey,
    shopOrigin,
    host,
  });
  // console.log(apiKey, shopOrigin, host);
  if (loading) {
    return (
      <AppProvider>
        <Spinner />
      </AppProvider>
    );
  } else if (allowed) {
    return (
      <AppProvider 
      i18n={{
        Polaris: {
          Frame: {
            skipToContent: 'Skip to content',
          },
          ContextualSaveBar: {
            save: 'Save',
            discard: 'Discard',
          },
        },
        translations:[en, pl, sv, es],
      }}
      >
        <Provider config={config}>
        <StoreProvider>
          <MyProvider
            Component={Component}
            {...pageProps}
            shopOrigin={shopOrigin}
            host={host}
          />
          </StoreProvider>
        </Provider>
      </AppProvider>
    );
  } else {

      /** If charge is not active we redirect them to the confirmation URL */
    app.dispatch(
        Redirect.toRemote({
          url: `${confirmationUrl}`,
        }),
      );
    return <div>Something went wrong</div>;
  }
};

export default authStep;
