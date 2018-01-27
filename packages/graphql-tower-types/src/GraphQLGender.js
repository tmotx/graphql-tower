import { GraphQLEnumType } from 'graphql';

export default new GraphQLEnumType({
  name: 'Gender',
  values: {
    male: { value: 1 },
    female: { value: 2 },
    other: { value: 3 },
  },
});
