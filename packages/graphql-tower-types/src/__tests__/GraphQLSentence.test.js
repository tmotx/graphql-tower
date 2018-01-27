import _ from 'lodash';
import faker from 'faker';
import { GraphQLError } from 'graphql';
import { GraphQLSentence } from '../index';
import expectGraphql from './index';

describe('GraphQLSentence', () => {
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
      query: `query { value (input: "${_.repeat(value, 20)}") }`,
      result: { errors: [new GraphQLError(`Argument "input" has invalid value "${_.repeat(value, 20)}".\nExpected type "Sentence", found "${_.repeat(value, 20)}".`)] },
      calledTimes: 0,
    }, {
      query: 'query($input: Sentence) { value (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Sentence) { value (input: $input) }',
      args: { input: _.repeat(value, 20) },
      result: { errors: [new GraphQLError(`Variable "$input" got invalid value "${_.repeat(value, 20)}".\nExpected type "Sentence", found "${_.repeat(value, 20)}": Sentence length more than the maximum length of 255`)] },
      calledTimes: 0,
    }], expectGraphql(GraphQLSentence), Promise.resolve());
  });
});
