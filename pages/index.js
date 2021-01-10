import { Loading, Frame, Spinner } from "@shopify/polaris";
// import deleteSection from './../components/delete_section';
import React, { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";
import Cookies from "js-cookie";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "./../server/config/config";
import "../styles.scss";
import lscache from "lscache";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Index = () => {
  const [storeData, setStoreData] = useState();
  const [msg, setMsg] = useState();
  const action = "init";
  const shop = Cookies.get("shopOrigin");

  const getSettings = () => {
    fetch(`${TUNNEL_URL}/api/data?shop=${shop}&action=${action}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((json) => {
        setStoreData(json);
      });
    // lscache.set('greeting', 'Hello World!', 300000);
    const message = lscache.get("message");
    if (message) {
      setMsg(message);
      return;
    } else {
      lscache.set("message", "true", 300000);
    }
  };
  useEffect(() => {
    getSettings();
  }, [shop]);

  if (storeData && msg) {
    return <Dashboard storeData={storeData} shop={shop} banner={msg} />;
  } else {
    return (
      <div style={{ height: "100px" }}>
        <Frame>
          <Loading />
          <Spinner
            accessibilityLabel="Spinner example"
            size="large"
            color="teal"
          />
        </Frame>
      </div>
    );
  }
};

Index.getInitialProps = async () => ({
  namespacesRequired: ["common", "dashboard"],
});

export default Index;
