import Spinner from "../components/SpinnerComponent";
// import deleteSection from './../components/delete_section';
import React, { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "./../server/config/config";
import lscache from "lscache";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Index = ({ shopOrigin: shop }) => {
  const abortController = new AbortController();
  const [storeData, setStoreData] = useState();
  const [msg, setMsg] = useState(false);
  const [review, setReview] = useState(false);
  const action = "init";

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
    if (lscache.get("message")) {
      setMsg(lscache.get("message"));
    } else {
      lscache.set("message", "true", 300000);
    }
    if (lscache.get("review")) {
      setReview(lscache.get("review"));
      return;
    } else {
      lscache.set("review", "true", 300000);
    }
  };

  useEffect(() => {
    getSettings();
    return () => {
      abortController.abort();
    };
  }, [shop]);

  if (storeData && msg) {
    return (
      <Dashboard
        storeData={storeData}
        shop={shop}
        banner={msg}
        reviewBanner={review}
      />
    );
  } else {
    return <Spinner />;
  }
};

export const getServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["dashboard", "banner"])),
  },
});

export default Index;
