import React from "react";
import { Loading, Frame, Spinner } from "@shopify/polaris";

const SpinnerComponent = () => (
  <div style={{ height: "100px" }}>
    <Frame>
      <Loading />
      <Spinner accessibilityLabel="Spinner example" size="large" color="teal" />
    </Frame>
  </div>
);

export default SpinnerComponent;
