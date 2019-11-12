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

const update = props => {
  console.log(props);
  const [buttonDisabled, setButtonDisabled] = useState(
    props.data.disableUpdate
  );
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState();
  const [version, setVersion] = useState(props.data.version);

  const install = () => {
    fetch(`${TUNNEL_URL}/api/update`)
      .then(res => res.json())
      .then(json => {
        //console.log(json);
        setButtonDisabled(true);
        setVersion(props.data.latestVersion);
        setBanner(true);
        setTimeout(() => {
          setBanner(false);
        }, 8000);
      })
      .catch(err => console.log(err));
  };

  // console.log(getSettings());

  const bannerMessage = banner ? (
    <Banner status="success">Reinstall &amp; Update was successful!</Banner>
  ) : null;

  return (
    <section>
      {bannerMessage}
      <Divider xl />
      <Layout>
        <Layout.AnnotatedSection
          title="Update App"
          description="Keep your app up to date when new versions is relesed"
        >
          <Card sectioned>
            <Button onClick={install} disabled={buttonDisabled}>
              Update now
            </Button>
            <br />
            <br />
            {buttonDisabled
              ? `Store version: ${props.data.latestVersion} is up to date`
              : `update: ${props.data.version} => ${props.data.latestVersion}`}
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </section>
  );
};

export default update;
