import faker from 'faker';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLInt } from 'graphql';
import { Query } from '../';

describe('Query', () => {
  it('snapshot', async () => {
    const query = new Query();
    expect(query).toMatchSnapshot();
  });

  it('successfully query', async () => {
    const value = faker.random.number();
    const resolve = jest.fn(() => Promise.resolve(value));

    const Node = class extends Query {
      type = GraphQLInt;
      resolve = resolve;
    };


    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({ name: 'Query', fields: { node: new Node() } }),
    });

    const { data } = await graphql(schema, 'query { node }');
    expect(data).toEqual({ node: value });
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
