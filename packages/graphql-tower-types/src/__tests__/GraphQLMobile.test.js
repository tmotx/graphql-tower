import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLMobile } from '../index';
import expectGraphql from './index';

describe('GraphQLMobile', () => {
  it('successfully query', async () => {
    const value = `886${_.padStart('963066131', 13, 0)}`;

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "963066131") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "963066131".\nExpected type "Mobile", found "963066131".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Mobile) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Mobile) { value (input: $input) }',
      args: { input: 963066131 },
      result: { errors: [new TypeError('Variable "$input" got invalid value 963066131.\nExpected type "Mobile", found 963066131: Mobile cannot represent non value: 963066131')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLMobile), Promise.resolve());
  });
});
