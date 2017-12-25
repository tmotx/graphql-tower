import { graphql, GraphQLString, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Query, resolveMask } from '../';

const createSchema = (checker, fieldName) => {
  const GraphQLType = new GraphQLObjectType({
    name: 'Type',
    fields: () => ({
      name: {
        type: GraphQLString,
        resolve: resolveMask(checker, fieldName),
      },
    }),
  });

  const Node = class extends Query {
    type = GraphQLType;
    resolve = () => ({ name: 'Jerry', code: 'XXX' });
  };

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: { node: new Node() },
    }),
  });
};

describe('resolveMask', () => {
  it('when return true', async () => {
    const checker = jest.fn(() => true);
    const schema = createSchema(checker);
    const { data } = await graphql(schema, 'query { node { name } }');
    expect(data.node.name).toBe('Jerry');
    expect(checker.mock.calls[0]).toMatchSnapshot();
  });

  it('when return true and setup fileName', async () => {
    const schema = createSchema(() => true, 'code');
    const { data } = await graphql(schema, 'query { node { name } }');
    expect(data.node.name).toBe('XXX');
  });

  it('when return false', async () => {
    const schema = createSchema(() => false);
    const { data } = await graphql(schema, 'query { node { name } }');
    expect(data.node.name).toBe(null);
  });

  it('when throw error', async () => {
    const schema = createSchema(() => { throw new Error(); });
    const { data } = await graphql(schema, 'query { node { name } }');
    expect(data.node.name).toBe(null);
  });

  it('when Promise.reject', async () => {
    const schema = createSchema(() => Promise.reject(new Error()));
    const { data } = await graphql(schema, 'query { node { name } }');
    expect(data.node.name).toBe(null);
  });
});
