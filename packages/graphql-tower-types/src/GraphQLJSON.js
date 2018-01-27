import isObject from 'lodash/isObject';
import GraphQLParserType from './GraphQLParserType';

export default new GraphQLParserType({
  name: 'JSON',
  parseValue(value) {
    if (isObject(value)) return value;
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new TypeError(`JSON cannot represent non value: ${value}`);
    }
  },
});
