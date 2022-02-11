import React, { useCallback } from "react";
import { Store } from "../../store/store";
import * as types from "../../store/types";
import { Card, RangeSlider, Checkbox,TextField } from "@shopify/polaris";

const BasicSettings = () => {
  const { data, dispatch } = React.useContext(Store);
  const { value: postNumber } = data.settings.postNumber;
  const { value: target } = data.settings.target;
  const { value: sectionTitle } = data.settings.sectionTitle;
  const { value: sectionSubtitle } = data.settings.sectionSubtitle;

  const handleRangeSliderChange = useCallback((value) => {
    dispatch({
      type: types.CHANGE_POST_NUMBER,
      payload: value,
    });
  }, []);

  const handleTarget = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_TARGET,
      payload: newValue,
    });
  }, []);

  const handleTitleChange = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_SECTIONTITLE,
      payload: newValue,
    });
  }, []);

  const handleSubtitleChange = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_SECTIONSUBTITLE,
      payload: newValue,
    });
  }, []);

  return (
    <Card sectioned title="Basic settings">
      <Card.Section >
      <TextField
          label="Section Title"
          value={sectionTitle}
          onChange={handleTitleChange}
          autoComplete="off"
          placeholder=""
        />
      </Card.Section>
      <Card.Section >
      <TextField
          label="Section Subtitle"
          value={sectionSubtitle}
          onChange={handleSubtitleChange}
          autoComplete="off"
          placeholder=""
        />
      </Card.Section>
      <Card.Section title="Number of posts" >
        <RangeSlider
          label={postNumber}
          value={postNumber}
          onChange={handleRangeSliderChange}
          output
          min={1}
          max={30}
        />
      </Card.Section>
      <Card.Section title="Open on link on new page?" >
        <Checkbox
          label=""
          checked={target}
          onChange={handleTarget}
        />
      </Card.Section>
    </Card>
  );
};

export default BasicSettings;
