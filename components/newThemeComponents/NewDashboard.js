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
  Layout,
} from "@shopify/polaris";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { TroubleShootBanner, ReviewBanner } from "../Banners";
import * as types from "../../store/types";
import { Store } from "../../store/store";
import UrlInput from "./UrlInput";
import BasicSetings from "./BasicSettings";
import Filters from "./Filters";
import ShowExcerpt from "./ShowExcerpt";
import LastPost from "./LastPost";

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
  const { theme, shop, disableSave, settings, testedOK } = data;
  useEffect(() => {
    if (banner === undefined) {
      setShowBanner(true);
      setShowReviewBanner(true);
    }
  }, [banner, reviewBanner]);
  const handleSubmit = () => {
    axios.post(`/api/data`, {
      settings
    })
      .then(({data,status}) => {
        if (status === 200) {
          dispatch({
            type: types.FETCH_METADATA,
            payload: data,
          });
          dispatch({
            type: types.SAVE_DB,
          });
        } else {
          console.log("!!! unsuccesful upload settings :( !!!");
        }
      })
      .catch((err) => err);
  };

  /** Link to the shop theme customizer */
  const themeSectionEditor = (
    <Button
      primary
      disabled={!testedOK}
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
        disabled: !testedOK,
      }}
      discardAction={{
        onAction: () => getSettings(),
      }}
    />
  );

  const handleDeleteAllMeta = () => {
    axios.post(`/api/deletedata`, {
      settings
    }).then(()=>dispatch({
      type: types.RESET_DATA,
      }));
  }


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
                To get started please set your Wordpress URL and some basic
                settings here below. After saving the settings you can head over
                to the Theme section editor to customize the widget
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
          <UrlInput />
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <Layout>
            <Layout.Section oneThird>
              <BasicSetings />
            </Layout.Section>
            <Layout.Section oneThird>
              <Filters />
            </Layout.Section>
            <Layout.Section oneThird>
              <ShowExcerpt />
            </Layout.Section>
          </Layout>
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <ReviewBanner
            showBanner={showReviewBanner}
            setShowBanner={setShowReviewBanner}
          />
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <TroubleShootBanner
            showBanner={showBanner}
            setShowBanner={setShowBanner}
          />
          <Button destructive onClick={handleDeleteAllMeta}>Delete all meta tags</Button>
          
        </Page>
      </Frame>
    );
};

export default Dashboard;
