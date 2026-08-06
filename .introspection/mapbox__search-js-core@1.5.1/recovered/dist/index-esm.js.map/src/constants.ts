const decimalWithNoLeadingDigits = '\\.\\d{1,256}';
const integerWithOptionalDecimal = `\\d{1,3}(${decimalWithNoLeadingDigits})?`;

const singleCoordinate = `(-?(${integerWithOptionalDecimal}|${decimalWithNoLeadingDigits}))`;

/**
 * Regular expression to match a coordinate string in the format "lat, lon".
 * Checks that the string is a plausible shape, but does not actually validate
 * latitude and longitude against their respective ranges.
 * Evaluates to /^[ ]*(-?(\d{1,3}(\.\d{1,256})?|\.\d{1,256})),\s*(-?(\d{1,3}(\.\d{1,256})?|\.\d{1,256}))[ ]*$/
 */
export const COORDINATE_QUERY_REGEX = new RegExp(
  `^[ ]*${singleCoordinate},\\s*${singleCoordinate}[ ]*$`
);

export const SPACES_OR_COMMA_REGEX = /[\s,]+/;
