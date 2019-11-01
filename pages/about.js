import { Page, Heading, DisplayText } from "@shopify/polaris";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const About = () => {
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
          query($id: Int) {
            apps(where: { id: $id }) {
              edges {
                node {
                  id
                  title
                  date
                  content(format: RENDERED)
                }
              }
            }
          }
        `,
        variables: {
          id: 387,
          format: "RENDERED"
        }
      })
      .then(result => {
        console.log(result.data.apps.edges[0].node.content);
        setContent({ __html: result.data.apps.edges[0].node.content });
      })
      .catch(err => console.log(err));
  };

  const MyComponent = () => (
    <div className="post" dangerouslySetInnerHTML={content} />
  );

  useEffect(() => {
    fetchDataAction();
  }, [pageURI]);

  return (
    <Page>
      <div className="post-heading">
        <DisplayText size="Large" element="h1">
          Documentaion
        </DisplayText>
      </div>

      {MyComponent()}
    </Page>
  );
};

export default About;
