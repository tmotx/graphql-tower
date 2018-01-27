import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { GraphQLExpiration } from '../index';
import expectGraphql from './index';

describe('GraphQLExpiration', () => {
  it('successfully query', async () => {
    const past = faker.date.past();
    const future = faker.date.future();

    await _.reduce([{
      value: 0,
      query: 'query { value }',
      result: { data: { value: false } },
    }, {
      value: past,
      query: 'query { value }',
      result: { data: { value: false } },
    }, {
      value: future,
      query: 'query { value }',
      result: { data: { value: future.toISOString() } },
    }, {
      query: `query { value (input: "${past.getTime()}") }`,
      calledWith: [undefined, { input: past }, undefined, expect.anything()],
    }, {
      query: `query { value (input: "${future.toISOString()}") }`,
      calledWith: [undefined, { input: future }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Expiration", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Expiration) { value (input: $input) }',
      args: { input: past.getTime() },
      calledWith: [undefined, { input: past }, undefined, expect.anything()],
    }, {
      query: 'query($input: Expiration) { value (input: $input) }',
      args: { input: future.toISOString() },
      calledWith: [undefined, { input: future }, undefined, expect.anything()],
    }, {
      query: 'query($input: Expiration) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "Expiration", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(GraphQLExpiration), Promise.resolve());
  });
});
