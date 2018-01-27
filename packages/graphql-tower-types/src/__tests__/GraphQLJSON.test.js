import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { GraphQLJSON } from '../index';
import expectGraphql from './index';

describe('GraphQLJSON', () => {
  it('successfully query', async () => {
    const value = faker.helpers.userCard();

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      value: JSON.stringify(value),
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${JSON.stringify(value).replace(/"/g, '\\"')}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "JSON", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: JSON) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: JSON) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "JSON", found "XYZ": JSON cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLJSON), Promise.resolve());
  });
});
