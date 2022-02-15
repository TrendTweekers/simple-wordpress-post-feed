// import deleteSection from './../components/delete_section';
import React, { useContext, useState, useEffect } from "react";
import { Store } from "../store/store";
import fetch from "isomorphic-unfetch";
import About from "../components/About";
import Dashboard from "../components/Dashboard";
import Header from "../components/Header";
import Spinner from "../components/SpinnerComponent";
import NewDashboard from "../components/newThemeComponents/NewDashboard";
import * as types from "../store/types";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Index = ({ shopOrigin: shop }) => {
  const abortController = new AbortController();
  const { data, dispatch } = useContext(Store);
  const [page, setPage] = useState("main");
  const {newThemeCapable} = data.support;
  
  const fetchShopData = () =>
    fetch(`/api/data?shop=${shop}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((json) => json);

  const getMetaData = () =>
    fetch(`/api/meta?shop=${shop}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((json) => json);

  const getSettings = async () => {
    dispatch({
      type: types.LOADING,
      payload: true,
    });
    const metaData = await getMetaData();
    const shopData = await fetchShopData();

      dispatch({
        type: types.FETCH_METADATA,
        payload: metaData,
      });

      dispatch({
        type: types.FETCH_DATA,
        payload: shopData,
      });
      dispatch({
        type:types.LOADING,
        payload:false
      })

  };

  useEffect(() => {
    getSettings();
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const dashboardComponent = newThemeCapable ? <NewDashboard getSettings={getSettings}/> : <Dashboard />;

  const activePage = page === "main" ? dashboardComponent : <About newThemeCapable={newThemeCapable}/>;

  if (data.isLoading) {
    return <Spinner />;
  } else {
    return (
      <>
        <Header shop={shop} handleClick={setPage} />
        {activePage}
      </>
    );
  }
};

export default Index;
