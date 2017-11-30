import faker from 'faker';
import { graphql, GraphQLInt, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Query, PayloadField } from '../';

describe('PayloadField', () => {
  it('snapshot', async () => {
    const payloadField = new PayloadField();
    expect(payloadField).toMatchSnapshot();
  });

  it('successfully query', async () => {
    const resolve = jest.fn((payload, { id }) => id);
    const Node = class extends Query {
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
                field: new Node({ id: new PayloadField() }),
                custom: new Node({ id: new PayloadField('tempId') }),
                handler: new Node({ id: new PayloadField(({ tempId: id }) => id) }),
                value: new Node({ id: value }),
              },
            }),
            resolve: () => ({ id: fieldId, tempId }),
          },
        },
      }),
    });

    const result = await graphql(schema, 'query { node { field custom handler value } }');
    expect(result.data.node).toEqual({
      field: fieldId, custom: tempId, handler: tempId, value,
    });
  });
});
