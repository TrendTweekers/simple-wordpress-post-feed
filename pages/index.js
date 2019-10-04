import { Heading, Page } from "@shopify/polaris";
import React, { useEffect } from "react";

const Index = () => {
  const fetchDataAction = () => {
    fetch("/api/install")
      .then(res => res.json())
      .catch(err => console.log(err));
  };

  useEffect(() => {
    fetchDataAction();
  }, []);
  return (
    <Page>
      <Heading>Shopify app with Node and React 🎉</Heading>
    </Page>
  );
};

export default Index;
