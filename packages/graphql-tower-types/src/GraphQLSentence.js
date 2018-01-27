import GraphQLStringType from './GraphQLStringType';

export default new GraphQLStringType({
  name: 'Sentence',
  maxLength: 255,
});
