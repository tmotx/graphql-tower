import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLTimeZone } from '../index';
import expectGraphql from './index';

describe('GraphQLTimeZone', () => {
  it('successfully query', async () => {
    await _.reduce([{
      value: null,
      query: 'query { value }',
      result: { data: { value: null } },
    }, {
      value: '+08:30',
      query: 'query { value }',
      result: { data: { value: '+08:30' } },
    }, {
      value: '-8.5',
      query: 'query { value }',
      result: { data: { value: '-08:30' } },
    }, {
      value: 60 * 8.5 * -1,
      query: 'query { value }',
      result: { data: { value: '+08:30' } },
    }, {
      query: 'query { value (input: "+08:30") }',
      calledWith: [undefined, { input: '+08:30' }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "-8.5") }',
      calledWith: [undefined, { input: '-08:30' }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "TimeZone", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: TimeZone) { value (input: $input) }',
      args: { input: '+08:30' },
      calledWith: [undefined, { input: '+08:30' }, undefined, expect.anything()],
    }, {
      query: 'query($input: TimeZone) { value (input: $input) }',
      args: { input: 60 * 8.5 * -1 },
      calledWith: [undefined, { input: '+08:30' }, undefined, expect.anything()],
    }, {
      query: 'query($input: TimeZone) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "TimeZone", found "XYZ": TimeZone cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLTimeZone), Promise.resolve());
  });
});
