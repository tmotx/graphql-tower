import _ from 'lodash';
import faker from 'faker';
import moment from 'moment';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLInterfaceType, GraphQLError } from 'graphql';
import { toGlobalId } from 'graphql-tower-global-id';
import {
  GraphQLResponseStatus,
  GraphQLGID,
  GraphQLDate,
  GraphQLExpiration,
  GraphQLSentence,
  GraphQLMobile,
  GraphQLInheritanceType,
  GraphQLGlobalIdField,
} from '../index';

const resolve = jest.fn();

const base = new GraphQLInterfaceType({
  name: 'Base',
  fields: {
    id: new GraphQLGlobalIdField(),
  },
  resolveType: obj => obj.type,
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      responseStatus: {
        type: GraphQLResponseStatus,
        args: { input: { type: GraphQLResponseStatus } },
        resolve,
      },
      gid: {
        type: GraphQLGID,
        args: { input: { type: GraphQLGID } },
        resolve,
      },
      date: {
        type: GraphQLDate,
        args: { input: { type: GraphQLDate } },
        resolve,
      },
      expiration: {
        type: GraphQLExpiration,
        args: { input: { type: GraphQLExpiration } },
        resolve,
      },
      sentence: {
        type: GraphQLSentence,
        args: { input: { type: GraphQLSentence } },
        resolve,
      },
      mobile: {
        type: GraphQLMobile,
        args: { input: { type: GraphQLMobile } },
        resolve,
      },
      node: {
        type: new GraphQLObjectType({
          name: 'Node',
          fields: {
            id: new GraphQLGlobalIdField(),
            customId: new GraphQLGlobalIdField('custom'),
          },
        }),
        resolve,
      },
      inheritance: {
        type: new GraphQLInheritanceType({
          name: 'Inheritance',
          interfaces: [base],
          fields: () => ({ name: { type: GraphQLSentence } }),
        }),
        resolve,
      },
    },
  }),
});

async function expectGraphql(previous, {
  value, query, result, args, calledWith, calledTimes,
}) {
  await previous;

  resolve.mockClear();
  if (!_.isUndefined(value)) resolve.mockReturnValueOnce(value);
  const reply = await graphql(schema, query, undefined, undefined, args);
  if (result) expect(reply).toEqual(result);
  if (calledWith) expect(resolve).toHaveBeenLastCalledWith(...calledWith);
  if (!_.isUndefined(calledTimes)) expect(resolve).toHaveBeenCalledTimes(calledTimes);
}

describe('type', () => {
  it('GraphQLResponseStatus', async () => {
    await _.reduce([{
      value: 0,
      query: 'query { responseStatus }',
      result: { data: { responseStatus: 'failed' } },
    }, {
      value: 1,
      query: 'query { responseStatus }',
      result: { data: { responseStatus: 'ok' } },
    }, {
      query: 'query { responseStatus (input: failed) }',
      calledWith: [undefined, { input: 0 }, undefined, expect.anything()],
    }, {
      query: 'query { responseStatus (input: ok) }',
      calledWith: [undefined, { input: 1 }, undefined, expect.anything()],
    }, {
      query: 'query { responseStatus (input: yt) }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value yt.\nExpected type "ResponseStatus", found yt.')] },
      calledTimes: 0,
    }, {
      query: 'query($input: ResponseStatus) { responseStatus (input: $input) }',
      args: { input: 'failed' },
      calledWith: [undefined, { input: 0 }, undefined, expect.anything()],
    }, {
      query: 'query($input: ResponseStatus) { responseStatus (input: $input) }',
      args: { input: 'ok' },
      calledWith: [undefined, { input: 1 }, undefined, expect.anything()],
    }, {
      query: 'query($input: ResponseStatus) { responseStatus (input: $input) }',
      args: { input: 'yt' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "yt".\nExpected type "ResponseStatus", found "yt".')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLGID', async () => {
    const value = faker.lorem.word();

    await _.reduce([{
      value,
      query: 'query { gid }',
      result: { data: { gid: value } },
    }, {
      query: `query { gid (input: "${value}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { gid (input: "Ac1+/") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "Ac1+/".\nExpected type "GlobalID", found "Ac1+/".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: GlobalID) { gid (input: $input) }',
      args: { input: value },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: GlobalID) { gid (input: $input) }',
      args: { input: 'Ac1+/' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "Ac1+/".\nExpected type "GlobalID", found "Ac1+/": invalid global id')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLDate', async () => {
    const value = new Date();

    await _.reduce([{
      value: null,
      query: 'query { date }',
      result: { data: { date: null } },
    }, {
      value,
      query: 'query { date }',
      result: { data: { date: moment(value).utc().format() } },
    }, {
      value: value.getTime(),
      query: 'query { date }',
      result: { data: { date: moment(value).utc().format() } },
    }, {
      query: `query { date (input: "${value.toISOString()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: `query { date (input: "${value.getTime()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { date (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Date", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Date) { date (input: $input) }',
      args: { input: value.toISOString() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Date) { date (input: $input) }',
      args: { input: value.getTime() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: Date) { date (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "Date", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLExpiration', async () => {
    const past = faker.date.past();
    const future = faker.date.future();

    await _.reduce([{
      value: 0,
      query: 'query { expiration }',
      result: { data: { expiration: false } },
    }, {
      value: past,
      query: 'query { expiration }',
      result: { data: { expiration: false } },
    }, {
      value: future,
      query: 'query { expiration }',
      result: { data: { expiration: moment(future).utc().format() } },
    }, {
      query: `query { expiration (input: "${past.getTime()}") }`,
      calledWith: [undefined, { input: past }, undefined, expect.anything()],
    }, {
      query: `query { expiration (input: "${future.toISOString()}") }`,
      calledWith: [undefined, { input: future }, undefined, expect.anything()],
    }, {
      query: 'query { expiration (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Expiration", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Expiration) { expiration (input: $input) }',
      args: { input: past.getTime() },
      calledWith: [undefined, { input: past }, undefined, expect.anything()],
    }, {
      query: 'query($input: Expiration) { expiration (input: $input) }',
      args: { input: future.toISOString() },
      calledWith: [undefined, { input: future }, undefined, expect.anything()],
    }, {
      query: 'query($input: Expiration) { expiration (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "Expiration", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLSentence', async () => {
    const sentence = faker.lorem.sentence();

    await _.reduce([{
      value: sentence,
      query: 'query { sentence }',
      result: { data: { sentence } },
    }, {
      query: `query { sentence (input: "${sentence}") }`,
      calledWith: [undefined, { input: sentence }, undefined, expect.anything()],
    }, {
      query: `query { sentence (input: "${_.repeat(sentence, 20)}") }`,
      result: { errors: [new GraphQLError(`Argument "input" has invalid value "${_.repeat(sentence, 20)}".\nExpected type "Sentence", found "${_.repeat(sentence, 20)}".`)] },
      calledTimes: 0,
    }, {
      query: 'query($input: Sentence) { sentence (input: $input) }',
      args: { input: sentence },
      calledWith: [undefined, { input: sentence }, undefined, expect.anything()],
    }, {
      query: 'query($input: Sentence) { sentence (input: $input) }',
      args: { input: _.repeat(sentence, 20) },
      result: { errors: [new GraphQLError(`Variable "$input" got invalid value "${_.repeat(sentence, 20)}".\nExpected type "Sentence", found "${_.repeat(sentence, 20)}": sentence length exceeds the maximum length of 255`)] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLMobile', async () => {
    const mobile = `886${_.padStart('963066131', 13, 0)}`;

    await _.reduce([{
      value: mobile,
      query: 'query { mobile }',
      result: { data: { mobile } },
    }, {
      query: `query { mobile (input: "${mobile}") }`,
      calledWith: [undefined, { input: mobile }, undefined, expect.anything()],
    }, {
      query: 'query { mobile (input: "963066131") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "963066131".\nExpected type "Mobile", found "963066131".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Mobile) { mobile (input: $input) }',
      args: { input: mobile },
      calledWith: [undefined, { input: mobile }, undefined, expect.anything()],
    }, {
      query: 'query($input: Mobile) { mobile (input: $input) }',
      args: { input: 963066131 },
      result: { errors: [new TypeError('Variable "$input" got invalid value 963066131.\nExpected type "Mobile", found 963066131: Mobile cannot represent non value: 963066131')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  describe('GraphQLGlobalIdField', () => {
    it('when resolve is object', async () => {
      const reply = {
        id: faker.random.number(),
        customId: faker.random.number(),
      };

      resolve.mockReturnValueOnce(reply);
      const result = await graphql(schema, 'query { node { id customId } }');
      expect(result.data.node).toEqual({
        id: toGlobalId('Node', reply.id),
        customId: toGlobalId('custom', reply.customId),
      });
    });

    it('when resolve is string', async () => {
      const reply = faker.random.number();

      resolve.mockReturnValueOnce(reply);
      const result = await graphql(schema, 'query { node { id customId } }');
      expect(result.data.node).toEqual({
        id: toGlobalId('Node', reply),
        customId: toGlobalId('custom', reply),
      });
    });

    it('when resolve is global id', async () => {
      const reply = toGlobalId('Node', faker.random.number());

      resolve.mockReturnValueOnce(reply);
      const result = await graphql(schema, 'query { node { id } }');
      expect(result.data.node).toEqual({ id: reply });
    });
  });

  describe('GraphQLInheritanceType', () => {
    it('successfully inherited', async () => {
      resolve.mockReturnValueOnce({ id: '99', name: 'an inheritance object' });
      const result = await graphql(schema, 'query { inheritance { id name } }');
      expect(result.data.inheritance).toEqual({
        id: toGlobalId('Inheritance', '99'),
        name: 'an inheritance object',
      });
    });
  });
});
