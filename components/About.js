import {Page} from "@shopify/polaris";
import React, {useState, useEffect} from "react";
import ApolloClient, {gql} from "apollo-boost";

import Spinner from "./SpinnerComponent";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const About = () => {
  const [content, setContent] = useState();
  const pageURI = "mesmerize-pro";

  const fetchDataAction = () => {
    const wordpress = new ApolloClient({
      uri: "https://stackedboost.com/graphql",
    });

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
          format: "RENDERED",
        },
      })
      .then((result) => {
        setContent({__html: result.data.apps.edges[0].node.content});
      })
      .catch((err) => console.log(err));
  };

  const MyComponent = () => (<div
    className="post"
    dangerouslySetInnerHTML={content}
                             />
    );

  useEffect(() => {
    fetchDataAction();
  }, [pageURI]);

  if (content) {
    return <Page title="Documentation" > { MyComponent() } </Page>;
  } else {
    return <Spinner />;
  }
};

export default About;
