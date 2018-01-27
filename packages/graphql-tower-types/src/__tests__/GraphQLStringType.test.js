import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { GraphQLStringType } from '../index';
import expectGraphql from './index';

const type = new GraphQLStringType({
  name: 'StringType',
  minLength: 10,
  maxLength: 100,
});

describe('GraphQLStringType', () => {
  it('successfully query', async () => {
    const value = faker.lorem.sentence();

    await _.reduce([{
      value,
      query: 'query { value }',
      result: { data: { value } },
    }, {
      query: `query { value (input: "${value}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { value (input: "XXX") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XXX".\nExpected type "StringType", found "XXX".')] },
      calledTimes: 0,
    }, {
      query: `query { value (input: "${_.repeat(value, 20)}") }`,
      result: { errors: [new GraphQLError(`Argument "input" has invalid value "${_.repeat(value, 20)}".\nExpected type "StringType", found "${_.repeat(value, 20)}".`)] },
      calledTimes: 0,
    }, {
      query: 'query($input: StringType) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: StringType) { value (input: $input) }',
      args: { input: 'XXX' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XXX".\nExpected type "StringType", found "XXX": StringType length less than the minimum length of 10')] },
      calledTimes: 0,
    }, {
      query: 'query($input: StringType) { value (input: $input) }',
      args: { input: _.repeat(value, 20) },
      result: { errors: [new GraphQLError(`Variable "$input" got invalid value "${_.repeat(value, 20)}".\nExpected type "StringType", found "${_.repeat(value, 20)}": StringType length more than the maximum length of 100`)] },
      calledTimes: 0,
    }], expectGraphql(type), Promise.resolve());
  });
});
