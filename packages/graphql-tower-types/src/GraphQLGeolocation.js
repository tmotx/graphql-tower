import _ from 'lodash';
import GraphQLParserType from './GraphQLParserType';

const parseJSON = (input) => {
  try {
    if (_.isObject(input)) {
      return input;
    }

    return JSON.parse(input);
  } catch (e) {
    throw new TypeError(`Geolocation cannot represent non value: ${input}`);
  }
};

export default new GraphQLParserType({
  name: 'Geolocation',
  parseValue(input) {
    const geolocation = parseJSON(input);
    const keys = [
      ['accuracy', _.isInteger],
      ['latitude', _.isNumber],
      ['longitude', _.isNumber],
    ];
    const result = {};

    keys.forEach(([key, validator]) => {
      const value = _.get(geolocation, [key]);
      if (!validator(value)) {
        throw new TypeError(`Geolocation.${key} cannot represent non value: ${value}`);
      }
      result[key] = value;
    });

    return result;
  },
  fake: { accuracy: 60, latitude: 35.175217, longitude: -121.553512 },
});
