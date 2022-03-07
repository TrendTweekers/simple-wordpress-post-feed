import { Button, Card, TextContainer, Banner } from "@shopify/polaris";
import React, { useState } from "react";
import axios from "axios";
import { Store } from "../store/store";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const UpdateSection = () => {
  const { data } = React.useContext(Store);
  const { version, latestVersion, disableUpdate, shop } = data;
  const [buttonDisabled, setButtonDisabled] = useState(
    latestVersion === version
  );
  const [banner, setBanner] = useState(false);
  const action = "update";

  const update = () => {
    setButtonDisabled(true);
    setBanner(true);
    setTimeout(() => {
      setBanner(false);
    }, 9000);
    axios
      .post(`/api/update`, {
        shop,
        action,
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

  const versionNumber = buttonDisabled
    ? `Store version ${data.latestVersion} is up to date`
    : `update: ${version} => ${latestVersion}`;

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
          <p>{versionNumber}</p>
        </TextContainer>
      </Card>
    </section>
  );
};

export default UpdateSection;
