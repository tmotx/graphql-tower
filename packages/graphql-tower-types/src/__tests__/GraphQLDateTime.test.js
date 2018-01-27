import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLDateTime } from '../index';
import expectGraphql from './index';

describe('GraphQLDateTime', () => {
  it('successfully query', async () => {
    const value = new Date();

    await _.reduce([{
      value: null,
      query: 'query { value }',
      result: { data: { value: null } },
    }, {
      value,
      query: 'query { value }',
      result: { data: { value: value.toISOString() } },
    }, {
      value: value.getTime(),
      query: 'query { value }',
      result: { data: { value: value.toISOString() } },
    }, {
      query: `query { value (input: "${value.toISOString()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: `query { value (input: "${value.getTime()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "DateTime", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: DateTime) { value (input: $input) }',
      args: { input: value.toISOString() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: DateTime) { value (input: $input) }',
      args: { input: value.getTime() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: DateTime) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "DateTime", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLDateTime), Promise.resolve());
  });
});
