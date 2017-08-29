import _ from 'lodash';
import { GraphQLID, GraphQLInt } from 'graphql';
import Mutation from '../mutation';

describe('mutation', () => {
  it('Mutation', async () => {
    const MutationNode = class extends Mutation {};
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
  });

  it('Mutation with name', async () => {
    const MutationNode = class extends Mutation {
      name = 'Node';
    };
    const mutation = new MutationNode();
    expect(mutation).toMatchSnapshot();
    expect(_.get(mutation, 'type.name')).toBe('NodePayload');
    expect(_.get(mutation, 'args.input.type.ofType.name')).toBe('NodeInput');
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
