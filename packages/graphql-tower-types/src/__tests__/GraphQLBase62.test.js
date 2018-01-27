import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLBase62 } from '../index';
import expectGraphql from './index';

describe('GraphQLBase62', () => {
  it('successfully query', async () => {
    await _.reduce([{
      value: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      query: 'query { value }',
      result: { data: { value: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' } },
    }, {
      value: 999,
      query: 'query { value }',
      result: { data: { value: '999' } },
    }, {
      query: 'query { value (input: 999) }',
      calledWith: [undefined, { input: '999' }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") }',
      calledWith: [undefined, { input: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "_") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "_".\nExpected type "Base62", found "_".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Base62) { value (input: $input) }',
      args: { input: 999 },
      calledWith: [undefined, { input: '999' }, undefined, expect.anything()],
    }, {
      query: 'query($input: Base62) { value (input: $input) }',
      args: { input: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
      calledWith: [undefined, { input: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' }, undefined, expect.anything()],
    }, {
      query: 'query($input: Base62) { value (input: $input) }',
      args: { input: '_' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "_".\nExpected type "Base62", found "_": Base62 cannot represent non value: _')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLBase62), Promise.resolve());
  });
});
