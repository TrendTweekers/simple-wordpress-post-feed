import React, { useCallback, useState,useEffect } from "react";
import {
  TextField,
  Checkbox,
  FormLayout,
  Card,
  Banner,
} from "@shopify/polaris";
import { Store } from "../../store/store";
import fetch from "cross-fetch";

const UrlInput = () => {
  const { data, dispatch } = React.useContext(Store);
  const {value} = data.settings.url;
  const { value: hostedOnWP } = data.settings.hostedOnWP;
  const { testedOK } = data;

  const isUrl = (inputString) => {
    const regexp =
      /(https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if (regexp.test(inputString)) {
      return inputString;
    }

    return `https://${inputString}`;
  };

  const testFetch = async () => {
    const correctUrl = isUrl(value);
    try {
      const wpContent = await fetch(
        `${correctUrl}/wp-json/wp/v2/posts?_embed&order=desc&per_page=1`
      ).then((res) =>
        res.json().then((json) => {
          return { status: res.status, json };
        })
      );
      if (wpContent.status == 200) {
        dispatch({
          type: "TESTED",
          payload: true,
        });
      } else {
        dispatch({
          type: "TESTED",
          payload: false,
        });
      }
      return wpContent;
    } catch (err) {
      console.log(err);
    }
  };



    useEffect(() => {
      const delayedTestFetch =
      setTimeout(() => {
        testFetch();
      }, 1000);
    
      return () => {
        clearTimeout(delayedTestFetch)
      };
    }, [value]);
    


  const handleChange = useCallback((newValue) => {
    dispatch({
      type: "CHANGE_URL",
      payload: newValue,
    });
    
  }, []);

  const handleChangeCheckBox = useCallback((newChecked) => {
    dispatch({
      type: "HOSTED_ON_WP",
      payload: newChecked,
    });
  }, []);

  const TestBanner = testedOK ? (
    <Banner title="The entered URL is correct" status="success" />
  ) : (
    <Banner
      title="Please enter a valid URL or check where the website is hosted"
      status="critical"
    />
  );

  return (
    <Card sectioned title="Hosting">
      <FormLayout>
        <Checkbox
          label="Hosted on Wordpress?"
          checked={hostedOnWP}
          onChange={handleChangeCheckBox}
        />
        <TextField
          label="Wordpress Site URL"
          value={value}
          onChange={handleChange}
          autoComplete="off"
          type="url"
          placeholder="https://..."
          onBlur={() => testFetch()}
          inputMode="url"
        />
        {TestBanner}
      </FormLayout>
    </Card>
  );
};

export default UrlInput;
