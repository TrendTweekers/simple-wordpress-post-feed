/* eslint-disable shopify/jsx-no-hardcoded-content */
/* eslint-disable shopify/prefer-early-return */
/* eslint-disable react/prop-types */
import {
  Frame,
  Page,
  ContextualSaveBar,
  Card,
  TextContainer,
  Heading,
  Button,
} from "@shopify/polaris";
import React, { useState, useEffect } from "react";

import { TroubleShootBanner, ReviewBanner } from "../Banners";
import { Store } from "../../store/store";
import UrlInput from "./UrlInput";
import PostNumber from "./PostNumber";
import Filters from "./Filters";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ banner, reviewBanner, getSettings }) => {
  const { data, dispatch } = React.useContext(Store);
  const [showBanner, setShowBanner] = useState(banner === "true");
  const [showReviewBanner, setShowReviewBanner] = useState(
    reviewBanner === "true"
  );
  const { theme, shop, disableSave,settings } = data;
  useEffect(() => {
    if (banner === undefined) {
      setShowBanner(true);
      setShowReviewBanner(true);
    }
  }, [banner, reviewBanner]);

  const handleSubmit = () => {
    console.log('settings')
    console.log(settings)
    fetch(`/api/data?shop=${shop}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      referrer: 'no-referrer',
      body: JSON.stringify(settings),
    })
      .then((res) => {
        if (res.status === 201) {
          console.log('succesful upload settings')
          dispatch({
            type: "SAVE_DB",
          })
        } else {
          console.log('!!! unsuccesful upload settings :( !!!')
        }
      })
      .catch((err) => err);
  };

  /** Link to the shop theme customizer */
  const themeSectionEditor = (
    <Button
      primary
      onClick={() =>
        window.open(`https://${shop}/admin/themes/${theme}/editor`, "_blank")
      }
    >
      Theme section editor
    </Button>
  );

  const SaveBar = disableSave ? null : (
    <ContextualSaveBar
      fullWidth
      message="Unsaved changes"
      saveAction={{
        onAction: () => handleSubmit(),
      }}
      discardAction={{
        onAction: () => getSettings(),
      }}
    />
  );

  return (
    <Frame>
      {SaveBar}
      <Page title="Simple Wordpress Post Feed">
        <Card sectioned>
          <TextContainer>
            <Heading>
              Thank you for installing Simple Wordpress Post Feed!
            </Heading>
            <p>
              To get started go to Theme section editor and add the Wordpress
              Post Feed section. For more detailed instructions see the
              documentation
            </p>
            {themeSectionEditor}
            <p>
              <i>
                Hope you enjoy the app and please don&apos;t forget to leave a
                review{" "}
                <span role="img" aria-label="kisses">
                  😘
                </span>
              </i>
            </p>
          </TextContainer>
        </Card>
        <br />
        <UrlInput />
        <PostNumber />
        <Filters/>
        <ReviewBanner
          showBanner={showReviewBanner}
          setShowBanner={setShowReviewBanner}
        />
        <br />
        <TroubleShootBanner
          showBanner={showBanner}
          setShowBanner={setShowBanner}
        />
      </Page>
    </Frame>
  );
};

export default Dashboard;
