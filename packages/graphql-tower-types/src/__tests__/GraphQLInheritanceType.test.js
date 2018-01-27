import _ from 'lodash';
import {
  GraphQLInterfaceType,
  GraphQLID,
  GraphQLString,
} from 'graphql';
import { GraphQLInheritanceType } from '../index';
import expectGraphql from './index';

const base = new GraphQLInterfaceType({
  name: 'Base',
  fields: {
    id: { type: GraphQLID },
  },
  resolveType: obj => obj.type,
});

const type = new GraphQLInheritanceType({
  name: 'Inheritance',
  interfaces: [base],
  fields: () => ({ name: { type: GraphQLString } }),
});

describe('GraphQLJSON', () => {
  it('successfully query', async () => {
    const value = { id: '99', name: 'an inheritance object' };
    await _.reduce([{
      value,
      query: 'query { value { id name } }',
      result: { data: { value } },
    }], expectGraphql(type, { args: {} }), Promise.resolve());
  });
});
