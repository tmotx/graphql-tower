import GraphQLParserType from './GraphQLParserType';

export default new GraphQLParserType({
  name: 'Age',
  serialize: value => new Date(Date.now()).getUTCFullYear() - new Date(value).getUTCFullYear(),
  parseValue(value) {
    const age = parseInt(value, 10);

    if (Number.isNaN(age) || age < 1 || age > 150) {
      throw new TypeError(`Age cannot represent non value: ${age}`);
    }

    return new Date(Date.UTC(new Date(Date.now()).getUTCFullYear() - age, 0, 1, 0, 0, 0));
  },
  fake: 18,
});
