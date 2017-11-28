import _ from 'lodash';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLID, GraphQLInt } from 'graphql';
import { Mutation } from '../';

describe('Mutation', () => {
  it('snapshot', async () => {
    const MutationNode = class extends Mutation {};
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
  });

  it('with name', async () => {
    const PropertyNode = class extends Mutation { name = 'Node'; };
    const property = new PropertyNode();
    expect(property).toMatchSnapshot();
    expect(_.get(property, 'type.name')).toBe('NodePayload');
    expect(_.get(property, 'args.input.type.ofType.name')).toBe('NodeInput');

    const ClassNameNode = class Node extends Mutation {};
    const classname = new ClassNameNode();
    expect(classname).toMatchSnapshot();
    expect(_.get(classname, 'type.name')).toBe('NodePayload');
    expect(_.get(classname, 'args.input.type.ofType.name')).toBe('NodeInput');
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
