import _ from 'lodash';
import faker from 'faker';
import { graphql, GraphQLInt, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { QueryWithConnection } from '../';

describe('QueryWithConnection', () => {
  it('QueryWithConnection', async () => {
    const resolve = jest.fn();
    const QueryConnection = class extends QueryWithConnection {
      type = GraphQLInt;
      args = { id: { type: GraphQLInt } };
      resolve = resolve;
    };

    const query = new QueryConnection();
    expect(query).toMatchSnapshot();

    expect(query.node).toEqual(GraphQLInt);

    const queryExtend = _.extend({}, query);
    expect(queryExtend.node).toBeUndefined();
    expect(queryExtend.args).not.toBeUndefined();
    expect(queryExtend.type).not.toBeUndefined();
    expect(queryExtend.resolve).not.toBeUndefined();

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

    expect(result.data.connection).toEqual(reply);
  });
});
