import GraphQLIntegerType from './GraphQLIntegerType';

export default new GraphQLIntegerType({
  name: 'Percent',
  min: 1,
  max: 100,
});
