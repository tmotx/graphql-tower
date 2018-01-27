import GraphQLRegexType from './GraphQLRegexType';

export default new GraphQLRegexType({
  name: 'Mobile',
  regex: /^[1-9]{1,5}0[0-9]{12}$/,
});
