// import deleteSection from './../components/delete_section';
import React, {useState, useEffect} from "react";
import fetch from "isomorphic-unfetch";
import {serverSideTranslations} from "next-i18next/serverSideTranslations";

import About from "../components/About";
import Dashboard from "../components/Dashboard";
import Header from "../components/Header";
import Spinner from "../components/SpinnerComponent";
import {TUNNEL_URL} from "../server/config/config";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Index = ({shopOrigin: shop}) => {
  const abortController = new AbortController();
  const [storeData, setStoreData] = useState();
  const [page, setPage] = useState('main');

  const getSettings = () => {
    fetch(`${TUNNEL_URL}/api/data`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((json) => {
        setStoreData(json);
      })
      .catch((err) => console.log(err));

  };

  useEffect(() => {
    getSettings();
    return () => {
      abortController.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const activePage = page === 'main' ? <Dashboard storeData={storeData} shop={shop} /> : <About />;

  if (storeData) {
    return (
      <>
        <Header shop={shop} handleClick={setPage} />
        {activePage}
      </>
    );
  } else {
    return <Spinner />;
  }
};

export const getServerSideProps = async ({locale}) => ({
  props: {
    ...(await serverSideTranslations(locale, ["dashboard", "banner"])),
  },
});

export default Index;
