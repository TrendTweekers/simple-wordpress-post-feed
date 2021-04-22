import {Banner} from "@shopify/polaris";
import lscache from "lscache";
import {useTranslation} from "next-i18next";

export const TroubleShootBanner = ({showBanner, setShowBanner}) => {
  const {t} = useTranslation("banner");
  if (showBanner) {
    return (<Banner
      className="infobanner"
      title={t("infobanner")}
      onDismiss={
                () => {
                  lscache.set("message", "false", 300000);
                  setShowBanner(false);
                }
            }
      status="info"
            >
      <p > { t("infomessage") } { " " } <a
        href="https://stackedboost.com/apps/simple-wordpress-post-feed/#faq"
        target="blank"
                                        >
        { t("linkmessage") }
      </a>
      </p>
            </Banner>
    );
  } else {
    return null;
  }
};

export const ReviewBanner = ({showBanner, setShowBanner}) => {
  const {t} = useTranslation("banner");
  if (showBanner) {
    return (<Banner
      className="infobanner"
      title={t("Leave a review and Win 1 year free use!")}
      onDismiss={
                () => {
                  lscache.set("review", "false", 300000);
                  setShowBanner(false);
                }
            }
      status="info"
            >
      <p > {
                t(
                    "Don't forget to leave a review. You can be the lucky one who will get one year free subscription monthly!",
                )
            }
      </p> <ol > <li > <a
        href="https://apps.shopify.com/simple-wordpress-post-feed"
        target="blank"
                       >
        { t("Leave a review here") }
                       </a>
                 </li> <li > { t("Make a screenshot") } </li > <li > { t("Send it to us! ") } <a
        href="mailto: support@stackedboosthelp.zendesk.com"
        target="_blank"
        rel="noopener noreferrer"
                                                                                   >
        { t("support@stackedboosthelp.zendesk.com") }
                                                                                   </a>
                                                    </li>
           </ol>
            </Banner>
    );
  } else {
    return null;
  }
};
