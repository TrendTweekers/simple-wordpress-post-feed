import React, { useCallback, useState } from "react";
import { Store } from "../../store/store";
import {Card, RangeSlider} from '@shopify/polaris';

const PostNumber = () => {
    const { data, dispatch } = React.useContext(Store);
    const {value : postNumber} = data.settings.postNumber;
    const handleRangeSliderChange = useCallback(
        (value) => {
            dispatch({
                type:"CHANGE_POST_NUMBER",
                payload:value
            })
        },
        [],
      );
    
      return (
        <Card sectioned title="Number of posts">
          <RangeSlider
            label={`${postNumber} posts visible`}
            value={postNumber}
            onChange={handleRangeSliderChange}
            output
            min={1} max={30} 
          />
        </Card>
      );
    }

export default PostNumber;
