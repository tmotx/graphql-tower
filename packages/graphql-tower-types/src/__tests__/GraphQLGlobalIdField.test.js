import _ from 'lodash';
import faker from 'faker';
import { GraphQLObjectType } from 'graphql';
import { toGlobalId } from 'graphql-tower-global-id';
import { GraphQLGlobalIdField } from '../index';
import expectGraphql from './index';

const type = new GraphQLObjectType({
  name: 'Node',
  fields: {
    id: new GraphQLGlobalIdField(),
    customId: new GraphQLGlobalIdField('custom'),
  },
});

describe('GraphQLGlobalIdField', () => {
  it('successfully query', async () => {
    const id = faker.random.number();
    const customId = faker.random.number();
    const value = faker.random.number();
    const nodeId = toGlobalId('Node', faker.random.number());

    await _.reduce([{
      value: { id, customId },
      query: 'query { value { id customId } }',
      result: {
        data: {
          value: {
            id: toGlobalId('Node', id),
            customId: toGlobalId('custom', customId),
          },
        },
      },
    }, {
      value,
      query: 'query { value { id customId } }',
      result: {
        data: {
          value: {
            id: toGlobalId('Node', value),
            customId: toGlobalId('custom', value),
          },
        },
      },
    }, {
      value: nodeId,
      query: 'query { value { id } }',
      result: { data: { value: { id: nodeId } } },
    }], expectGraphql(type, { args: {} }), Promise.resolve());
  });
});
