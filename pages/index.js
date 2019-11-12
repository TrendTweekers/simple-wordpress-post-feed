import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Divider from "./../components/Divider";
import Update from "./../components/update_section";
// import deleteSection from './../components/delete_section';
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
  const [deleted, setDeleted] = useState(false);
  const [version, setVersion] = useState(storeData.version);

  const install = () => {
    fetch(`${TUNNEL_URL}/api/update`)
      .then(res => res.json())
      .then(json => {
        //console.log(json);
        setButtonDisabled(true);
        setVersion(storeData.latestVersion);
        setBanner(true);
        setDeleted(true);
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
      <Update data={storeData} />
    </Page>
  );
};

Index.getInitialProps = async ({ req }) => {
  const shop = "storehello";
  const action = "mivan";
  const res = await fetch(
    `${TUNNEL_URL}/api/data?shop=${shop}&action=${action}`,
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
  const json = await res.json();
  return { storeData: json };
};

export default Index;
