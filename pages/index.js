import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Divider from "./../components/Divider";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";
import Cookies from "js-cookie";

import fetch from "isomorphic-unfetch";

import Link from "next/link";
import { TUNNEL_URL } from "./../server/config/config";

import "../styles.scss";

const getSettings = async () => {
  const shopOrigin = await Cookies.get("shopOrigin");
  console.log("SHOP ORIGIN");
  console.log(shopOrigin);

  // getData = await getFs(APP, shop)
  fetch(`${TUNNEL_URL}/api/data`)
    .then(res => res.json())
    .then(json => {
      console.log("JSON");
      console.log(json);
    });
  // const json = await res;
  // console.log('JSON')
  // console.log(json);
  // return json;
};

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Index = ({ storeData }) => {
  const [buttonDisabled, setButtonDisabled] = useState(storeData.disableUpdate);
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState();
  const [version, setVersion] = useState(storeData.version);

  const install = () => {
    fetch(`${TUNNEL_URL}/api/update`)
      .then(res => res.json())
      .then(json => {
        //console.log(json);
        setButtonDisabled(true);
        setVersion(storeData.latestVersion);
        setBanner(true);
        setTimeout(() => {
          setBanner(false);
        }, 8000);
      })
      .catch(err => console.log(err));
  };

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
    <Page title="Simple Wordpress Feed">
      <Card sectioned>
        <p>
          <b>Thank for installing Simple Wordpress Post Feed.</b>
          <br /> To get started go to theme section editor and add the Simple
          Wordpress Post Feed section. For more detaild instructions see the{" "}
          <Link href="/about">
            <a>documentation</a>
          </Link>
          .<br />
          <br />
          <i>Hope you enjoy the app and dont forget to leave a reveiew 😘</i>
        </p>
      </Card>
      <Divider xl />
      {bannerMessage}
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
              ? `Store version: ${storeData.latestVersion} is up to date`
              : `update: ${storeData.version} => ${storeData.latestVersion}`}
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
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
    </Page>
  );
};

Index.getInitialProps = async ({ req }) => {
  const res = await fetch(`${TUNNEL_URL}/api/data`);
  const json = await res.json();
  return { storeData: json };
};

export default Index;
