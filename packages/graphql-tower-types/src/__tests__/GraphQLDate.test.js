import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLDate } from '../index';
import expectGraphql from './index';

describe('GraphQLDate', () => {
  it('successfully query', async () => {
    const date = new Date();
    const value = date.toISOString().substr(0, 10);

    await _.reduce([{
      value: null,
      query: 'query { value }',
      result: { data: { value: null } },
    }, {
      value: null,
      query: 'query { value }',
      result: { data: { value: null } },
    }, {
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      value: date.getTime(),
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: `query { value (input: "${date.getTime()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Date", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Date) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Date) { value (input: $input) }',
      args: { input: date.getTime() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Date) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "Date", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLDate), Promise.resolve());
  });
});
