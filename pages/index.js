import { Page } from "@shopify/polaris";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const Index = () => {
  return <Page>Hello world</Page>;
};

export default Index;
