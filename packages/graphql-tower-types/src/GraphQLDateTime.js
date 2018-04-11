import toNumber from 'lodash/toNumber';
import GraphQLParserType from './GraphQLParserType';

export default new GraphQLParserType({
  name: 'DateTime',
  serialize: value => new Date(value).toISOString(),
  parseValue(value) {
    const date = new Date(/^[0-9]+$/.test(value) ? toNumber(value) : value);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Date cannot represent non value: ${value}`);
    }

    return date;
  },
  fake: '2018-04-10T12:00:00.000Z',
});
