import GraphQLParserType from './GraphQLParserType';
import GraphQLDateTime from './GraphQLDateTime';

export default new GraphQLParserType({
  name: 'Expiration',
  serialize: (value) => {
    if (!value) return false;

    const date = new Date(value);
    if (date.getTime() < Date.now()) return false;

    return date.toISOString();
  },
  parseValue: value => GraphQLDateTime.parseValue(value),
});
