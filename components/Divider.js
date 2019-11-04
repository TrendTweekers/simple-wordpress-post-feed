import PropTypes from "prop-types";

const dividerStyle = {
  margin: "2rem 0",

  borderTop: "0.1rem solid #dfe3e8"
};

const dividerStyleXL = {
  margin: "4rem 0",
  borderTop: "0.1rem solid #dfe3e8"
};

const Divider = ({ xl }) => {
  if (xl) {
    return <div style={dividerStyleXL} />;
  }
  return <div style={dividerStyle} />;
};
Divider.propTypes = {
  xl: PropTypes.bool.isRequired
};

export default Divider;
