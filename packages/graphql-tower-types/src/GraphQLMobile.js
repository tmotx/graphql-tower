import GraphQLRegexType from './GraphQLRegexType';

export default new GraphQLRegexType({
  name: 'Mobile',
  regex: /^[1-9]\d{0,4}0[0-9]{12}$/,
  fake: '8860000963066131',
});
