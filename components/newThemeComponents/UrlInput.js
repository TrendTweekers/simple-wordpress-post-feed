import React, { useCallback, useEffect } from "react";
import {
  TextField,
  Checkbox,
  FormLayout,
  Card,
  Banner,
  Spinner,
} from "@shopify/polaris";
import { Store } from "../../store/store";
import * as types from "../../store/types";
import fetch from "cross-fetch";

const UrlInput = () => {
  const { data, dispatch } = React.useContext(Store);
  const { value: url } = data.settings.url;
  const { value: hostedOnWP } = data.settings.hostedOnWP;
  const { testedOK, shop, testing } = data;

  const isUrl = (inputString) => {
    const regexp =
      /(https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if (regexp.test(inputString)) {
      return inputString;
    }

    return `https://${inputString}`;
  };

  const testFetch = async () => {
    const selfHostedURL = `${isUrl(
      url
    )}/wp-json/wp/v2/posts?_embed&order=desc&per_page=1`;
    const wpHostedURL = `https://public-api.wordpress.com/rest/v1.1/sites/${isUrl(
      url
    )}/posts/?number=1`;
    try {
      const hostUrl = hostedOnWP ? wpHostedURL : selfHostedURL;
      const wpContent = await fetch(hostUrl).then((res) =>
        res.json().then((json) => {
          return { status: res.status, json };
        })
      );
      if (wpContent.status == 200) {
        dispatch({
          type: types.TESTEDOK,
          payload: true,
        });
        dispatch({
          type: types.LAST_POST,
          payload: wpContent.json[0],
        });
      } else {
        dispatch({
          type: types.TESTEDOK,
          payload: false,
        });
      }
      return wpContent;
    } catch (err) {
      dispatch({
        type: types.TESTEDOK,
        payload: false,
      });
    }
  };

  useEffect(() => {
    const delayedTestFetch = setTimeout(() => {
      testFetch();
    }, 1000);

    return () => {
      clearTimeout(delayedTestFetch);
    };
  }, [url, hostedOnWP]);

  const handleChange = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_URL,
      payload: newValue,
    });
  }, []);

  const handleChangeCheckBox = useCallback((newChecked) => {
    dispatch({
      type: types.HOSTED_ON_WP,
      payload: newChecked,
    });
  }, []);

  const TestBanner = testedOK ? (
    <Banner
      title="The entered URL is correct, do not forget to SAVE it and you are good to go :)"
      status="success"
    />
  ) : (
    <>
      <Banner
        title="Please enter a valid URL or check where the website is hosted"
        status="critical"
      />
      If it's just keeps not working{"  "}
      <a
        href={`mailto:support@stackedboosthelp.zendesk.com?subject=Simple Wordpress Post Feed- help for ${shop}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        support@stackedboosthelp.zendesk.com
      </a>
    </>
  );

  const SpinnerBanner = (
    <Banner title="" status="info">
      <Spinner size="small"/>
    </Banner>
  );
  return (
    <Card sectioned title="Hosting settings" id="hosting-settings">
      <FormLayout>
        <Checkbox
          label="Hosted on Wordpress?"
          checked={hostedOnWP}
          onChange={handleChangeCheckBox}
        />
        <TextField
          label="Wordpress Site URL"
          value={url}
          onChange={handleChange}
          autoComplete="off"
          type="url"
          placeholder="https://..."
          onBlur={() => testFetch()}
          inputMode="url"
        />
        {testing ? SpinnerBanner : TestBanner}
      </FormLayout>
    </Card>
  );
};

export default UrlInput;
