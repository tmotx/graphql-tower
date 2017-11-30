import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLID, GraphQLInt } from 'graphql';
import { Mutation } from '../';

describe('Mutation', () => {
  it('snapshot', async () => {
    const MutationNode = class extends Mutation {
      inputFields = {};
      outputFields = {};
    };
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
  });

  it('with fields', async () => {
    const MutationNode = class extends Mutation {
      inputFields = () => ({
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      });
      outputFields = () => ({
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      });
      resolve = (payload, { input }) => input;
    };

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({ name: 'Query', fields: { mutation: new MutationNode() } }),
    });

    const { data } = await graphql(schema, 'query { mutation ( input: { id: 10 value: 99 }) { id value } }');
    expect(data).toEqual({ mutation: { id: '10', value: 99 } });
  });
});
