import { Page } from "@shopify/polaris";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const Index = () => {
  const [content, setContent] = useState();
  const pageURI = "mesmerize-pro";

  const fetchDataAction = () => {
    console.log("fetchupdate run");
    const wordpress = new ApolloClient({
      uri: "https://stackedboost.com/graphql"
    });
    fetch("/api/install").catch(err => console.log(err));

    wordpress
      .query({
        query: gql`
          query($uri: String, $format: PostObjectFieldFormatEnum) {
            pageBy(uri: $uri) {
              id
              pageId
              title
              date
              uri
              content(format: $format)
            }
          }
        `,
        variables: {
          uri: pageURI,
          format: "RENDERED"
        }
      })
      .then(result => {
        setContent({ __html: result.data.pageBy.content });
      })
      .catch(err => console.log(err));
  };

  const MyComponent = () => <div dangerouslySetInnerHTML={content} />;

  useEffect(() => {
    fetchDataAction();
  }, [pageURI]);

  return <Page>{MyComponent()}</Page>;
};

export default Index;
