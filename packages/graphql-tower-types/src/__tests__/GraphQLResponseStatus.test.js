import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLResponseStatus } from '../index';
import expectGraphql from './index';

describe('GraphQLResponseStatus', () => {
  it('successfully query', async () => {
    await _.reduce([{
      value: 0,
      query: 'query { value }',
      result: { data: { value: 'failed' } },
    }, {
      value: 1,
      query: 'query { value }',
      result: { data: { value: 'ok' } },
    }, {
      query: 'query { value (input: failed) }',
      calledWith: [undefined, { input: 0 }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: ok) }',
      calledWith: [undefined, { input: 1 }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: yt) }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value yt.\nExpected type "ResponseStatus", found yt.')] },
      calledTimes: 0,
    }, {
      query: 'query($input: ResponseStatus) { value (input: $input) }',
      args: { input: 'failed' },
      calledWith: [undefined, { input: 0 }, undefined, expect.anything()],
    }, {
      query: 'query($input: ResponseStatus) { value (input: $input) }',
      args: { input: 'ok' },
      calledWith: [undefined, { input: 1 }, undefined, expect.anything()],
    }, {
      query: 'query($input: ResponseStatus) { value (input: $input) }',
      args: { input: 'yt' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "yt".\nExpected type "ResponseStatus", found "yt".')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLResponseStatus), Promise.resolve());
  });
});
