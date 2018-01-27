import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLPercent } from '../index';
import expectGraphql from './index';

describe('GraphQLPercent', () => {
  it('successfully query', async () => {
    const value = 50;

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: 50 }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "200") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "200".\nExpected type "Percent", found "200".')] },
      calledTimes: 0,
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Percent", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Percent) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: 50 }, undefined, expect.anything()],
    }, {
      query: 'query($input: Percent) { value (input: $input) }',
      args: { input: -10 },
      result: { errors: [new TypeError('Variable "$input" got invalid value -10.\nExpected type "Percent", found -10: Percent cannot represent non value: -10')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Percent) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Percent", found "XYZ": Percent cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLPercent), Promise.resolve());
  });
});
