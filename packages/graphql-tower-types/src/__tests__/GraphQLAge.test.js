import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLAge } from '../index';
import expectGraphql from './index';

describe('GraphQLAge', () => {
  it('successfully query', async () => {
    Date.now = () => 1512557954249;
    const value = 30;

    await _.reduce([{
      value: '1987-09-19',
      query: 'query { value }',
      result: { data: { value } },
    }, {
      value: new Date(536457600000),
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: new Date(536457600000) }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "200") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "200".\nExpected type "Age", found "200".')] },
      calledTimes: 0,
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Age", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Age) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: new Date(536457600000) }, undefined, expect.anything()],
    }, {
      query: 'query($input: Age) { value (input: $input) }',
      args: { input: -10 },
      result: { errors: [new TypeError('Variable "$input" got invalid value -10.\nExpected type "Age", found -10: Age cannot represent non value: -10')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Age) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Age", found "XYZ": Age cannot represent non value: NaN')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLAge), Promise.resolve());
  });
});
