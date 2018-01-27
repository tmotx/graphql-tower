import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { GraphQLEmail } from '../index';
import expectGraphql from './index';

describe('GraphQLEmail', () => {
  it('successfully query', async () => {
    const value = faker.internet.email();

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Email", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Email) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Email) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Email", found "XYZ": Email cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLEmail), Promise.resolve());
  });
});
