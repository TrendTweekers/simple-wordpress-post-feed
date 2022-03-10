import React, { useCallback, useEffect } from "react";
import { Store } from "../../store/store";
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

const LastPost = () => {
  const { data } = React.useContext(Store);
  const { lastPost } = data;
  //console.log(lastPost);

  if (lastPost) {
    return (
      <Card>
        <div className="swpf-box">
          <img
            loading="lazy"
            alt={lastPost.title.rendered}
            src={
              lastPost._embedded["wp:featuredmedia"][0].media_details.sizes[
                "full"
              ].source_url
            }
          ></img>
            <div className="swpf_box_title">{lastPost.title.rendered}</div>
        </div>
      </Card>
    );
  } else {
    return (
      <Card>
        <div style={{ height: "100px" }}></div>
      </Card>
    );
  }
};

export default LastPost;
