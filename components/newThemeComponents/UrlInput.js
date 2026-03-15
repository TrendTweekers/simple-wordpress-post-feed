import React, { useCallback, useEffect } from "react";
import {
  TextField,
  Checkbox,
  FormLayout,
  Card,
  Banner,
  Spinner,
} from "@shopify/polaris";
import axios from "axios";
import { Store } from "../../store/store";
import * as types from "../../store/types";
import fetch from "cross-fetch";

const UrlInput = () => {
  const { data, dispatch } = React.useContext(Store);
  const { value: url } = data.settings.url;
  const { value: hostedOnWP } = data.settings.hostedOnWP;
  const { testedOK, shop, testing } = data;

  // ✅ FIX: Properly normalize WordPress URL
  // - Prepend https:// if missing
  // - Remove trailing slashes
  // - Validate domain exists
  const normalizeUrl = (inputString) => {
    if (!inputString || typeof inputString !== 'string') {
      return '';
    }

    let normalized = inputString.trim();

    // ✅ FIX: Add https:// if no protocol
    if (!normalized.match(/^https?:\/\//)) {
      normalized = `https://${normalized}`;
    }

    // ✅ FIX: Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // ✅ FIX: Validate URL has a domain (not just "https://")
    try {
      const urlObj = new URL(normalized);
      if (!urlObj.hostname) {
        console.warn('[UrlInput] Invalid URL - no hostname found');
        return '';
      }
      // Return normalized URL — only include pathname if it's not just the root '/'
      const path = urlObj.pathname && urlObj.pathname !== '/' ? urlObj.pathname.replace(/\/+$/, '') : '';
      return `https://${urlObj.hostname}${path}`;
    } catch (e) {
      console.error('[UrlInput] Invalid URL:', e.message);
      return '';
    }
  };

  const isUrl = (inputString) => {
    // ✅ FIX: Use normalized URL instead of regex-based function
    const normalized = normalizeUrl(inputString);
    if (!normalized) {
      console.warn('[UrlInput] isUrl: URL normalization failed for:', inputString);
      return '';
    }
    return normalized;
  };

  const urlStripWPHost = (inputString) => {
    // ✅ FIX: Extract domain from normalized URL
    const normalized = normalizeUrl(inputString);
    if (!normalized) {
      return '';
    }

    try {
      const urlObj = new URL(normalized);
      // For WordPress.com API, return domain.com (without https://)
      return urlObj.hostname;
    } catch (e) {
      console.error('[UrlInput] urlStripWPHost failed:', e.message);
      return '';
    }
  };

  const testFetch = async () => {
    // ✅ FIX Bug 3: Validate isUrl() returns a non-empty string before building fetch URL
    const normalizedSelfUrl = isUrl(url);
    const normalizedWPHost = urlStripWPHost(url);

    if (!normalizedSelfUrl && !hostedOnWP) {
      console.warn('[UrlInput] testFetch: normalized URL is empty, skipping fetch');
      dispatch({ type: types.TESTEDOK, payload: false });
      return;
    }
    if (!normalizedWPHost && hostedOnWP) {
      console.warn('[UrlInput] testFetch: WP host is empty, skipping fetch');
      dispatch({ type: types.TESTEDOK, payload: false });
      return;
    }

    const selfHostedURL = `${normalizedSelfUrl}/wp-json/wp/v2/posts?_embed&order=desc&per_page=1`;
    const wpHostedURL = `https://public-api.wordpress.com/rest/v1.1/sites/${normalizedWPHost}/posts/?number=1`;
    try {
      const hostUrl = hostedOnWP ? wpHostedURL : selfHostedURL;
      const wpContent = await axios(hostUrl).then(({status,data}) =>{
          return { status, data };
        });
      if (wpContent.status == 200) {

        dispatch({
          type: types.TESTEDOK,
          payload: true,
        });
        dispatch({
          type: types.LAST_POST,
          payload: wpContent.data[0],
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
    if (hostedOnWP) {
      dispatch({
        type: types.CHANGE_URL,
        payload: newValue,
      });
    } else {
      dispatch({
        type: types.CHANGE_URL,
        payload: newValue,
      });
    }
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
        href={`mailto:admin@stackedboost.com?subject=Simple Wordpress Post Feed- help for ${shop}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        admin@stackedboost.com
      </a>
    </>
  );

  const SpinnerBanner = (
    <Banner title="" status="info">
      <Spinner size="small" />
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
