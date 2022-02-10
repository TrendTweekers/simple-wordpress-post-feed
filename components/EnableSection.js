import {

  TextStyle,
  SettingToggle,

} from "@shopify/polaris";
import React, {useState} from "react";
import fetch from "isomorphic-unfetch";
import PropTypes from "prop-types";
import { Store } from '../store/store';


/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const EnableSection = () => {
  const { data, dispatch } = React.useContext(Store);
  const {clean,shop} = data;
  const [disabled, setDisabled] = useState(clean);

  const contentStatus = disabled ? "Enable" : "Disable";
  const textStatus = disabled ? "disabled" : "enabled";

  const handleClick = () => {
    const postData = {shop, action: null};
    if (disabled) {
      postData.action = "enable";
      setDisabled(false);
    } else {
      postData.action = "clean";
      setDisabled(true);
    }
    fetch(`/api/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow",
      referrer: "origin",
      body: JSON.stringify(postData),
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
