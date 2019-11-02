import { Page, Button } from "@shopify/polaris";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const Index = () => {
  const install = () => {
    fetch("/api/update")
      .then(res => res.json())
      .then(json => console.log(json))
      .catch(err => console.log(err));
  };

  return (
    <>
      <Page>Hello world</Page>
      <Button onClick={install}>Update Script</Button>
    </>
  );
};

export default Index;
