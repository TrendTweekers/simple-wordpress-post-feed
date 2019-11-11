import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Divider from "./Divider";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";
import Cookies from "js-cookie";

import fetch from "isomorphic-unfetch";

import Link from "next/link";
import { TUNNEL_URL } from "../server/config/config";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const deleteApp = props => {
  const [version, setVersion] = useState(props.data.version);

  const unInstall = () => {
    fetch(`${TUNNEL_URL}/api/delete`)
      .then(res => res.json())
      .then(json => {
        //console.log(json);
      })
      .catch(err => console.log(err));
  };

  // console.log(getSettings());

  const bannerMessage = banner ? (
    <Banner status="success">Reinstall &amp; Update was successful!</Banner>
  ) : null;

  return (
    <section>
      <Divider xl />
      <Layout>
        <Layout.AnnotatedSection
          title="Remove App Files"
          description="Remove Liquid files added by application"
        >
          <Card sectioned>
            <Button destructive onClick={unInstall}>
              Uninstall
            </Button>
            <br />
            <br />
            This will delete all liquid files and is recommended to do just
            before removing the app from your shopify store.
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </section>
  );
};

export default deleteApp;
