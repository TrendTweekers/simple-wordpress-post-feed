import { Page, Card, Banner } from "@shopify/polaris";

import Update from "./../components/update_section";
// import deleteSection from './../components/delete_section';
import React, { useState, useEffect } from "react";
import Dashboard from "./dashboard";

import Cookies from "js-cookie";

import fetch from "isomorphic-unfetch";

import Link from "next/link";
import { TUNNEL_URL } from "./../server/config/config";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Index = () => {
  const [storeData, setStoreData] = useState();
  const action = "init";
  const shop = Cookies.get("shopOrigin");

  const getSettings = () => {
    fetch(`${TUNNEL_URL}/api/data?shop=${shop}&action=${action}`, {
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .then(json => {
        setStoreData(json);
      });
  };
  useEffect(() => {
    getSettings();
  }, [shop]);

  if (storeData) {
    return <Dashboard storeData={storeData} />;
  } else {
    return <div>Loading...</div>;
  }
};

export default Index;
