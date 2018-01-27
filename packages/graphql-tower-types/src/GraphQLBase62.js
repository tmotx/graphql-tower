import GraphQLRegexType from './GraphQLRegexType';

export default new GraphQLRegexType({
  name: 'Base62',
  regex: /^[0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz]+$/,
});
