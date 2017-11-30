import faker from 'faker';
import { graphql, GraphQLInt, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { QueryWithNode } from '../';

describe('QueryWithNode', () => {
  it('snapshot', async () => {
    const query = new QueryWithNode();
    expect(query).toMatchSnapshot();
  });

  it('successfully query', async () => {
    const resolve = jest.fn((payload, { id }) => id);
    const QueryNode = class extends QueryWithNode {
      type = GraphQLInt;
      resolve = resolve;
    };

    const fieldId = faker.random.number();
    const tempId = faker.random.number();

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: {
            type: new GraphQLObjectType({
              name: 'Node',
              fields: {
                field: new QueryNode(),
                custom: new QueryNode('tempId'),
                empty: new QueryNode(),
              },
            }),
            resolve: () => ({ fieldId, tempId }),
          },
        },
      }),
    });

    const result = await graphql(schema, 'query { node { field custom empty } }');
    expect(result.data.node).toEqual({ field: fieldId, custom: tempId, empty: null });
  });
});
