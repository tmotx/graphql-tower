import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { toGlobalId } from 'graphql-tower-global-id';
import { GraphQLGID } from '../index';
import expectGraphql from './index';

describe('GraphQLGID', () => {
  it('successfully query', async () => {
    const value = toGlobalId('Type', faker.lorem.word());

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "Ac1+/") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "Ac1+/".\nExpected type "GlobalID", found "Ac1+/".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: GlobalID) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: GlobalID) { value (input: $input) }',
      args: { input: 'Ac1+/' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "Ac1+/".\nExpected type "GlobalID", found "Ac1+/": invalid global id')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLGID), Promise.resolve());
  });
});
