import {
  Button,
  Card,
  TextContainer,
} from "@shopify/polaris";
import React, {useState} from "react";
import fetch from "isomorphic-unfetch";
import PropTypes from "prop-types";

import {TUNNEL_URL} from "../server/config/config";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const LongTrial = ({data, shop}) => {
  const [buttonDisabled, setButtonDisabled] = useState(!data.longTrial);

  const update = () => {
    const postData = {shop, chargeID: data.chargeID};
    setButtonDisabled(true);
    fetch(`${TUNNEL_URL}/api/cancel`, {
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

  return (
    <section>
      <br />
      <Card title="Redeem your one year!" sectioned>
        <TextContainer>
          <p>Click on redeem, go back to the Apps, and accept the new terms</p>
          <Button onClick={update} disabled={buttonDisabled}>
            Redeem
          </Button>
        </TextContainer>
      </Card>
    </section>
  );
};

LongTrial.propTypes = {
  shop: PropTypes.string,
  data: PropTypes.shape({
    longTrial: PropTypes.bool,
    chargeID: PropTypes.string,
  }),
};

export default LongTrial;
