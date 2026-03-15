/* eslint-disable react/react-in-jsx-scope */
import {Banner} from "@shopify/polaris";
import lscache from "lscache";

export const TroubleShootBanner = ({showBanner, setShowBanner}) => {
  if (showBanner) {
    return (
      <Banner
        className="infobanner"
        title="Troubleshooting"
        onDismiss={() => {
          lscache.set("message", "false", 300000);
          setShowBanner(false);
        }}
        status="info"
      >
        <p>
        If you have problem displaying your wordpress posts please check our
          troubleshooting guide for instructions how to solve common issues{" "}
          <a href="https://stackedboost.com/apps/simple-wordpress-post-feed/#faq" target="blank">
            open troubleshooting
          </a>
        </p>
      </Banner>
    );
  } else {
    return null;
  }
};

export const ReviewBanner = ({showBanner, setShowBanner}) => {
  if (showBanner) {
    return (
      <Banner
        className="infobanner"
        title="Is the feed working on your store?"
        onDismiss={() => {
          lscache.set("review", "false", 300000);
          setShowBanner(false);
        }}
        status="info"
      >
        <p>
          If it is, a short review helps other merchants find the app and takes less than a minute.{" "}
          <a
            href="https://apps.shopify.com/simple-wordpress-post-feed#reviews"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leave a review →
          </a>
        </p>
      </Banner>
    );
  } else {
    return null;
  }
};
