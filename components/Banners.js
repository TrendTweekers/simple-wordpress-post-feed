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
        title="Leave a review and Win 1 year free use!"
        onDismiss={() => {
          lscache.set("review", "false", 300000);
          setShowBanner(false);
        }}
        status="info"
      >
        <p>
          Don&apos;t forget to leave a review. You can be the lucky one who will get
          one year free subscription monthly!
        </p>
        <ol>
          <li>
            <a
              href="https://apps.shopify.com/simple-wordpress-post-feed"
              target="blank"
            >
              Leave a review here
            </a>
          </li>
          <li> Make a screenshot</li>
          <li>
            Send it to us!{" "}
            <a
              href="mailto: support@stackedboosthelp.zendesk.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              support@stackedboosthelp.zendesk.com
            </a>
          </li>
        </ol>
      </Banner>
    );
  } else {
    return null;
  }
};
