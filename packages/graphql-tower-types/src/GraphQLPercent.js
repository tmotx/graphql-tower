import GraphQLNumberType from './GraphQLNumberType';

export default new GraphQLNumberType({
  name: 'Percent',
  min: 0,
  max: 100,
});
