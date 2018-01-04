import _ from 'lodash';
import faker from 'faker';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLInterfaceType, GraphQLError } from 'graphql';
import { toGlobalId } from 'graphql-tower-global-id';
import {
  GraphQLResponseStatus,
  GraphQLGID,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLTimeZone,
  GraphQLExpiration,
  GraphQLSentence,
  GraphQLMobile,
  GraphQLJSON,
  GraphQLEmail,
  GraphQLGender,
  GraphQLAge,
  GraphQLPercent,
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
      datetime: {
        type: GraphQLDateTime,
        args: { input: { type: GraphQLDateTime } },
        resolve,
      },
      timezone: {
        type: GraphQLTimeZone,
        args: { input: { type: GraphQLTimeZone } },
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
      json: {
        type: GraphQLJSON,
        args: { input: { type: GraphQLJSON } },
        resolve,
      },
      email: {
        type: GraphQLEmail,
        args: { input: { type: GraphQLEmail } },
        resolve,
      },
      gender: {
        type: GraphQLGender,
        args: { input: { type: GraphQLGender } },
        resolve,
      },
      age: {
        type: GraphQLAge,
        args: { input: { type: GraphQLAge } },
        resolve,
      },
      percent: {
        type: GraphQLPercent,
        args: { input: { type: GraphQLPercent } },
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
    const value = toGlobalId('Type', faker.lorem.word());

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
    const date = value.toISOString().substr(0, 10);

    await _.reduce([{
      value: null,
      query: 'query { date }',
      result: { data: { date: null } },
    }, {
      value: null,
      query: 'query { date }',
      result: { data: { date: null } },
    }, {
      value,
      query: 'query { date }',
      result: { data: { date } },
    }, {
      value: value.getTime(),
      query: 'query { date }',
      result: { data: { date } },
    }, {
      query: `query { date (input: "${date}") }`,
      calledWith: [undefined, { input: date }, undefined, expect.anything()],
    }, {
      query: `query { date (input: "${value.getTime()}") }`,
      calledWith: [undefined, { input: date }, undefined, expect.anything()],
    }, {
      query: 'query { date (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Date", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Date) { date (input: $input) }',
      args: { input: date },
      calledWith: [undefined, { input: date }, undefined, expect.anything()],
    }, {
      query: 'query($input: Date) { date (input: $input) }',
      args: { input: value.getTime() },
      calledWith: [undefined, { input: date }, undefined, expect.anything()],
    }, {
      query: 'query($input: Date) { date (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "Date", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLDateTime', async () => {
    const value = new Date();

    await _.reduce([{
      value: null,
      query: 'query { datetime }',
      result: { data: { datetime: null } },
    }, {
      value,
      query: 'query { datetime }',
      result: { data: { datetime: value.toISOString() } },
    }, {
      value: value.getTime(),
      query: 'query { datetime }',
      result: { data: { datetime: value.toISOString() } },
    }, {
      query: `query { datetime (input: "${value.toISOString()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: `query { datetime (input: "${value.getTime()}") }`,
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query { datetime (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "DateTime", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: DateTime) { datetime (input: $input) }',
      args: { input: value.toISOString() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: DateTime) { datetime (input: $input) }',
      args: { input: value.getTime() },
      calledWith: [undefined, { input: value }, undefined, expect.anything()],
    }, {
      query: 'query($input: DateTime) { datetime (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "DateTime", found "XYZ": Date cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLTimeZone', async () => {
    await _.reduce([{
      value: null,
      query: 'query { timezone }',
      result: { data: { timezone: null } },
    }, {
      value: '+08:30',
      query: 'query { timezone }',
      result: { data: { timezone: '+08:30' } },
    }, {
      value: '-8.5',
      query: 'query { timezone }',
      result: { data: { timezone: '-08:30' } },
    }, {
      value: 60 * 8.5 * -1,
      query: 'query { timezone }',
      result: { data: { timezone: '+08:30' } },
    }, {
      query: 'query { timezone (input: "+08:30") }',
      calledWith: [undefined, { input: '+08:30' }, undefined, expect.anything()],
    }, {
      query: 'query { timezone (input: "-8.5") }',
      calledWith: [undefined, { input: '-08:30' }, undefined, expect.anything()],
    }, {
      query: 'query { timezone (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "TimeZone", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: TimeZone) { timezone (input: $input) }',
      args: { input: '+08:30' },
      calledWith: [undefined, { input: '+08:30' }, undefined, expect.anything()],
    }, {
      query: 'query($input: TimeZone) { timezone (input: $input) }',
      args: { input: 60 * 8.5 * -1 },
      calledWith: [undefined, { input: '+08:30' }, undefined, expect.anything()],
    }, {
      query: 'query($input: TimeZone) { timezone (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new GraphQLError('Variable "$input" got invalid value "XYZ".\nExpected type "TimeZone", found "XYZ": TimeZone cannot represent non value: XYZ')] },
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
      result: { data: { expiration: future.toISOString() } },
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

  it('GraphQLJSON', async () => {
    const json = faker.helpers.userCard();
    await _.reduce([{
      value: json,
      query: 'query { json }',
      result: { data: { json } },
    }, {
      value: JSON.stringify(json),
      query: 'query { json }',
      result: { data: { json } },
    }, {
      query: `query { json (input: "${JSON.stringify(json).replace(/"/g, '\\"')}") }`,
      calledWith: [undefined, { input: json }, undefined, expect.anything()],
    }, {
      query: 'query { json (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "JSON", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: JSON) { json (input: $input) }',
      args: { input: json },
      calledWith: [undefined, { input: json }, undefined, expect.anything()],
    }, {
      query: 'query($input: JSON) { json (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "JSON", found "XYZ": Unexpected token X in JSON at position 0')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLEmail', async () => {
    const email = faker.internet.email();
    await _.reduce([{
      value: email,
      query: 'query { email }',
      result: { data: { email } },
    }, {
      query: `query { email (input: "${email}") }`,
      calledWith: [undefined, { input: email }, undefined, expect.anything()],
    }, {
      query: 'query { email (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Email", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Email) { email (input: $input) }',
      args: { input: email },
      calledWith: [undefined, { input: email }, undefined, expect.anything()],
    }, {
      query: 'query($input: Email) { email (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Email", found "XYZ": Email cannot represent non value: XYZ')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLAge', async () => {
    Date.now = () => 1512557954249;
    const age = 30;

    await _.reduce([{
      value: '1987-09-19',
      query: 'query { age }',
      result: { data: { age } },
    }, {
      value: new Date(536457600000),
      query: 'query { age }',
      result: { data: { age } },
    }, {
      query: `query { age (input: "${age}") }`,
      calledWith: [undefined, { input: new Date(536457600000) }, undefined, expect.anything()],
    }, {
      query: 'query { age (input: "200") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "200".\nExpected type "Age", found "200".')] },
      calledTimes: 0,
    }, {
      query: 'query { age (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Age", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Age) { age (input: $input) }',
      args: { input: age },
      calledWith: [undefined, { input: new Date(536457600000) }, undefined, expect.anything()],
    }, {
      query: 'query($input: Age) { age (input: $input) }',
      args: { input: -10 },
      result: { errors: [new TypeError('Variable "$input" got invalid value -10.\nExpected type "Age", found -10: Age cannot represent non value: -10')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Age) { age (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Age", found "XYZ": Age cannot represent non value: NaN')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLPercent', async () => {
    const percent = 50;

    await _.reduce([{
      value: percent,
      query: 'query { percent }',
      result: { data: { percent } },
    }, {
      query: `query { percent (input: "${percent}") }`,
      calledWith: [undefined, { input: 50 }, undefined, expect.anything()],
    }, {
      query: 'query { percent (input: "200") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "200".\nExpected type "Percent", found "200".')] },
      calledTimes: 0,
    }, {
      query: 'query { percent (input: "XYZ") }',
      result: { errors: [new GraphQLError('Argument "input" has invalid value "XYZ".\nExpected type "Percent", found "XYZ".')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Percent) { percent (input: $input) }',
      args: { input: percent },
      calledWith: [undefined, { input: 50 }, undefined, expect.anything()],
    }, {
      query: 'query($input: Percent) { percent (input: $input) }',
      args: { input: -10 },
      result: { errors: [new TypeError('Variable "$input" got invalid value -10.\nExpected type "Percent", found -10: Percent cannot represent non value: -10')] },
      calledTimes: 0,
    }, {
      query: 'query($input: Percent) { percent (input: $input) }',
      args: { input: 'XYZ' },
      result: { errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Percent", found "XYZ": Percent cannot represent non value: NaN')] },
      calledTimes: 0,
    }], expectGraphql, Promise.resolve());
  });

  it('GraphQLGender', async () => {
    await _.reduce([{
      value: 1,
      query: 'query { gender }',
      result: { data: { gender: 'male' } },
    }, {
      value: 2,
      query: 'query { gender }',
      result: { data: { gender: 'female' } },
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
