import faker from 'faker';
import { graphql, GraphQLInt, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { QueryWithConnection } from '../';

describe('QueryWithConnection', () => {
  it('snapshot', async () => {
    const query = new QueryWithConnection();
    expect(query).toMatchSnapshot();
  });

  it('successfully query', async () => {
    const resolve = jest.fn();
    const QueryConnection = class extends QueryWithConnection {
      type = GraphQLInt;
      args = { id: { type: GraphQLInt } };
      resolve = resolve;
    };

    const query = new QueryConnection();
    expect(query.node).toEqual(GraphQLInt);

    const first = faker.random.number();
    const offset = faker.random.number();
    const after = faker.lorem.word();
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { connection: query },
      }),
    });

    const reply = [faker.random.number(), faker.random.number()];

    resolve.mockReturnValueOnce(reply);
    const result = await graphql(schema, `
      query ($first: Int $offset: Int $after: String) {
        connection (first: $first offset: $offset after: $after)
      }`, {}, {}, { first, offset, after });

    expect(resolve).toHaveBeenCalledWith({}, { first, offset, after }, {}, expect.anything());
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(result.data.connection).toEqual(reply);
  });
});
