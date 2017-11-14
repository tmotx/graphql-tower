import _ from 'lodash';
import { GraphQLID, GraphQLInt } from 'graphql';
import { Mutation } from '../';

describe('Mutation', () => {
  it('Mutation', async () => {
    const MutationNode = class extends Mutation {};
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
  });

  it('Mutation with name', async () => {
    const PropertyNode = class extends Mutation {
      name = 'Node';
    };
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

  it('Mutation with fields', async () => {
    const MutationNode = class extends Mutation {
      name = 'Node';
      inputFields = {
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      };
      outputFields = {
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      };
    };
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
    expect(mutation.type.getFields()).toHaveProperty('id');
    expect(mutation.type.getFields()).toHaveProperty('value');
    expect(mutation.args.input.type.ofType.getFields()).toHaveProperty('id');
    expect(mutation.args.input.type.ofType.getFields()).toHaveProperty('value');
  });

  it('Mutation with thunk fields', async () => {
    const MutationNode = class extends Mutation {
      name = 'Node';
      inputFields = () => ({
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      });
      outputFields = () => ({
        id: { type: GraphQLID },
        value: { type: GraphQLInt },
      });
    };
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
    expect(mutation.type.getFields()).toHaveProperty('id');
    expect(mutation.type.getFields()).toHaveProperty('value');
    expect(mutation.args.input.type.ofType.getFields()).toHaveProperty('id');
    expect(mutation.args.input.type.ofType.getFields()).toHaveProperty('value');
  });
});
