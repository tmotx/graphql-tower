import _ from 'lodash';
import { GraphQLError } from 'graphql';
import { GraphQLNumberType } from '../index';
import expectGraphql from './index';

const type = new GraphQLNumberType({
  name: 'NumberType',
  min: 1,
  max: 100,
});

describe('GraphQLNumberType', () => {
  it('successfully query', async () => {
    const value = _.random(1.1, 99.9);

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: ${value}) }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: 200) }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value 200.\nExpected type "NumberType", found 200.')] },
      calledTimes: 0,
    }, {
      query: 'query { value (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "NumberType", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: NumberType) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: NumberType) { value (input: $input) }',
      args: { input: -10 },
      result: { errors: [new TypeError('Variable "$input" got invalid value -10.\nExpected type "NumberType", found -10: NumberType cannot represent non value: -10')] },
      calledTimes: 0,
    }, {
      query: 'query($input: NumberType) { value (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "NumberType", found "XYZ": NumberType cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql(type), Promise.resolve());
  });
});
