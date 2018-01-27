import { GraphQLEnumType } from 'graphql';

export default new GraphQLEnumType({
  name: 'ResponseStatus',
  values: {
    failed: { value: 0 },
    ok: { value: 1 },
  },
});
