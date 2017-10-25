import faker from 'faker';
import { graphql, GraphQLInt, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Query, PayloadField } from '../';

describe('PayloadField', () => {
  it('PayloadField', async () => {
    const resolve = jest.fn((payload, { id }) => id);
    const QueryNode = class extends Query {
      type = GraphQLInt;
      resolve = resolve;
    };

    const fieldId = faker.random.number();
    const tempId = faker.random.number();
    const value = faker.random.number();

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: {
            type: new GraphQLObjectType({
              name: 'Node',
              fields: {
                field: new QueryNode({ id: new PayloadField() }),
                custom: new QueryNode({ id: new PayloadField('tempId') }),
                value: new QueryNode({ id: value }),
              },
            }),
            resolve: () => ({ id: fieldId, tempId }),
          },
        },
      }),
    });

    const result = await graphql(schema, 'query { node { field custom value } }');
    expect(result.data.node).toEqual({ field: fieldId, custom: tempId, value });
  });
});
