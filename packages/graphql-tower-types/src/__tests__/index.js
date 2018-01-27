import _ from 'lodash';
import { graphql, GraphQLSchema, GraphQLObjectType } from 'graphql';

export default function expectGraphql(type, { args } = {}) {
  const resolve = jest.fn();
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        value: { type, args: args || { input: { type } }, resolve },
      },
    }),
  });

  return async (previous, {
    value, query, result, args: inputs, calledWith, calledTimes,
  }) => {
    await previous;

    resolve.mockClear();
    if (!_.isUndefined(value)) resolve.mockReturnValueOnce(value);
    const reply = await graphql(schema, query, undefined, undefined, inputs);
    if (result) expect(reply).toEqual(result);
    if (calledWith) expect(resolve).toHaveBeenLastCalledWith(...calledWith);
    if (!_.isUndefined(calledTimes)) expect(resolve).toHaveBeenCalledTimes(calledTimes);
  };
}
