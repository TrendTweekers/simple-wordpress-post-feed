import {
  Button,
  Card,
  TextContainer,
  Banner,
} from "@shopify/polaris";
import React, {useState} from "react";
import fetch from "isomorphic-unfetch";
import PropTypes from "prop-types";


/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const UpdateSection = ({data, shop}) => {
  const [buttonDisabled, setButtonDisabled] = useState(data.disableUpdate);
  const [banner, setBanner] = useState(false);
  const action = "update";

  const update = () => {
    const postData = {shop, action};
    setButtonDisabled(true);
    setBanner(true);
    setTimeout(() => {
      setBanner(false);
    }, 9000);
    fetch(`/api/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow",
      referrer: "no-referrer",
      body: JSON.stringify(postData),
    })
      .catch((err) => console.log(err));
  };

  // console.log(getSettings());

  const bannerMessage = banner ? (
    <div className="banner_animation">
      <Banner
        key="update_banner"
        status="success"
        title="Reinstall & Update was successful!"
      />
    </div>
  ) : null;

  const version = buttonDisabled
  ? `Store version ${data.latestVersion} is up to date`
  : `update: ${data.version} => ${data.latestVersion}`;

  return (
    <section>
      {bannerMessage}
      <br />
      <Card title="Update App" sectioned>
        <TextContainer>
          <p>Keep your app up to date when new version is released</p>
          <Button onClick={update} disabled={buttonDisabled}>
            Update now
          </Button>
          <p>
            {version}
          </p>
        </TextContainer>
      </Card>
    </section>
  );
};

UpdateSection.propTypes = {
  shop: PropTypes.string,
  data: PropTypes.shape({
    disableUpdate: PropTypes.bool,
    latestVersion: PropTypes.string,
    version: PropTypes.string,
  }),
};
// Specifies the default values for props:
UpdateSection.defaultProps = {
  data: {version: "1.1.1.1", latestVersion: "1.1.1.1", disableUpdate: true},
};

export default UpdateSection;
