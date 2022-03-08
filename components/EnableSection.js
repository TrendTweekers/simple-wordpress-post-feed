import { TextStyle, SettingToggle } from "@shopify/polaris";
import React, { useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { Store } from "../store/store";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const EnableSection = () => {
  const { data } = React.useContext(Store);
  const { clean, shop } = data;
  const [disabled, setDisabled] = useState(clean);

  const contentStatus = disabled ? "Enable" : "Disable";
  const textStatus = disabled ? "disabled" : "enabled";

  const handleClick = () => {
    const postData = { shop, action: disabled ? "enable" : "clean" };

    axios
      .post(`/api/update`, {
        ...postData,
      })
      .catch((err) => console.log(err));
  };
  return (
    <SettingToggle
      action={{
        content: contentStatus,
        onAction: handleClick,
      }}
      enabled={!disabled}
    >
      Section is <TextStyle variation="strong">{textStatus}</TextStyle>
    </SettingToggle>
  );
};

export default EnableSection;
