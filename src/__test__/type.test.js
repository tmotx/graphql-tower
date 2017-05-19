import _ from 'lodash';
import faker from 'faker';
import moment from 'moment';
import { graphql, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { GraphQLResponseStatus, GraphQLGID, GraphQLDate, GraphQLExpiration, GraphQLSentence } from '../type';

const resolve = jest.fn();

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
    },
  }),
});

describe('type', () => {
  it('GraphQLResponseStatus', async () => {
    resolve.mockClear();
    resolve.mockReturnValueOnce(0);
    expect(
      _.get(await graphql(schema, 'query { responseStatus }'), 'data.responseStatus'),
    ).toBe('failed');

    resolve.mockClear();
    resolve.mockReturnValueOnce(1);
    expect(
      _.get(await graphql(schema, 'query { responseStatus }'), 'data.responseStatus'),
    ).toBe('ok');

    resolve.mockClear();
    await graphql(schema, 'query { responseStatus (input: failed) }');
    expect(resolve).toHaveBeenLastCalledWith(undefined, { input: 0 }, undefined, expect.anything());

    resolve.mockClear();
    await graphql(schema, 'query { responseStatus (input: ok) }');
    expect(resolve).toHaveBeenLastCalledWith(undefined, { input: 1 }, undefined, expect.anything());

    resolve.mockClear();
    expect(
      await graphql(schema, 'query { responseStatus (input: yt) }'),
    ).toEqual({ errors: [new TypeError('Argument "input" has invalid value yt.\nExpected type "ResponseStatus", found yt.')] });
    expect(resolve).toHaveBeenCalledTimes(0);

    resolve.mockClear();
    await graphql(schema, 'query($input: ResponseStatus) { responseStatus (input: $input) }', undefined, undefined, { input: 'failed' });
    expect(resolve).toHaveBeenLastCalledWith(undefined, { input: 0 }, undefined, expect.anything());

    resolve.mockClear();
    await graphql(schema, 'query($input: ResponseStatus) { responseStatus (input: $input) }', undefined, undefined, { input: 'ok' });
    expect(resolve).toHaveBeenLastCalledWith(undefined, { input: 1 }, undefined, expect.anything());

    resolve.mockClear();
    expect(
      await graphql(schema, 'query($input: ResponseStatus) { responseStatus (input: $input) }', undefined, undefined, { input: 'yt' }),
    ).toEqual({ errors: [new TypeError('Variable "$input" got invalid value "yt".\nExpected type "ResponseStatus", found "yt".')] });
    expect(resolve).toHaveBeenCalledTimes(0);
  });

  it('GraphQLGID', async () => {
    const gid = faker.lorem.word();

    resolve.mockClear();
    resolve.mockReturnValueOnce(gid);
    expect(
      _.get(await graphql(schema, 'query { gid }'), 'data.gid'),
    ).toBe(gid);

    resolve.mockClear();
    await graphql(schema, `query { gid (input: "${gid}") }`);
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: gid }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query { gid (input: "Ac1+/") }'),
    ).toEqual({ errors: [new TypeError('invalid global id')] });
    expect(resolve).toHaveBeenCalledTimes(0);

    resolve.mockClear();
    await graphql(schema, 'query($input: GlobalID) { gid (input: $input) }', undefined, undefined, { input: gid });
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: gid }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query($input: GlobalID) { gid (input: $input) }', undefined, undefined, { input: 'Ac1+/' }),
    ).toEqual({ errors: [new TypeError('Variable "$input" got invalid value "Ac1+/".\nExpected type "GlobalID", found "Ac1+/": invalid global id')] });
    expect(resolve).toHaveBeenCalledTimes(0);
  });

  it('GraphQLDate', async () => {
    const date = new Date();

    resolve.mockClear();
    resolve.mockReturnValueOnce(0);
    expect(
      _.get(await graphql(schema, 'query { date }'), 'data.date'),
    ).toBeNull();

    resolve.mockClear();
    resolve.mockReturnValueOnce(date);
    expect(
      _.get(await graphql(schema, 'query { date }'), 'data.date'),
    ).toBe(moment(date).utc().format());

    resolve.mockClear();
    resolve.mockReturnValueOnce(date.getTime());
    expect(
      _.get(await graphql(schema, 'query { date }'), 'data.date'),
    ).toBe(moment(date).utc().format());

    resolve.mockClear();
    await graphql(schema, `query { date (input: "${date.toISOString()}") }`);
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: date }, undefined, expect.anything(),
    );

    resolve.mockClear();
    await graphql(schema, `query { date (input: ${date.getTime()}) }`);
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: date }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query { date (input: "XYZ") }'),
    ).toEqual({ errors: [new TypeError('Date cannot represent non value: XYZ')] });
    expect(resolve).toHaveBeenCalledTimes(0);

    resolve.mockClear();
    await graphql(schema, 'query($input: Date) { date (input: $input) }', undefined, undefined, { input: date.toISOString() });
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: date }, undefined, expect.anything(),
    );

    resolve.mockClear();
    await graphql(schema, 'query($input: Date) { date (input: $input) }', undefined, undefined, { input: date.getTime() });
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: date }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query($input: Date) { date (input: $input) }', undefined, undefined, { input: 'XYZ' }),
    ).toEqual({ errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Date", found "XYZ": Date cannot represent non value: XYZ')] });
    expect(resolve).toHaveBeenCalledTimes(0);
  });

  it('GraphQLExpiration', async () => {
    const past = faker.date.past();
    const future = faker.date.future();

    resolve.mockClear();
    resolve.mockReturnValueOnce(0);
    expect(
      _.get(await graphql(schema, 'query { expiration }'), 'data.expiration'),
    ).toBeNull();

    resolve.mockClear();
    resolve.mockReturnValueOnce(past);
    expect(
      _.get(await graphql(schema, 'query { expiration }'), 'data.expiration'),
    ).toBeNull();

    resolve.mockClear();
    resolve.mockReturnValueOnce(future);
    expect(
      _.get(await graphql(schema, 'query { expiration }'), 'data.expiration'),
    ).toBe(moment(future).utc().format());

    resolve.mockClear();
    await graphql(schema, `query { expiration (input: "${future.toISOString()}") }`);
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: future }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query { expiration (input: "XYZ") }'),
    ).toEqual({ errors: [new TypeError('Date cannot represent non value: XYZ')] });
    expect(resolve).toHaveBeenCalledTimes(0);

    resolve.mockClear();
    await graphql(schema, 'query($input: Expiration) { expiration (input: $input) }', undefined, undefined, { input: future.toISOString() });
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: future }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query($input: Expiration) { expiration (input: $input) }', undefined, undefined, { input: 'XYZ' }),
    ).toEqual({ errors: [new TypeError('Variable "$input" got invalid value "XYZ".\nExpected type "Expiration", found "XYZ": Date cannot represent non value: XYZ')] });
    expect(resolve).toHaveBeenCalledTimes(0);
  });

  it('GraphQLSentence', async () => {
    const sentence = faker.lorem.sentence();

    resolve.mockClear();
    resolve.mockReturnValueOnce(sentence);
    expect(
      _.get(await graphql(schema, 'query { sentence }'), 'data.sentence'),
    ).toBe(sentence);

    resolve.mockClear();
    await graphql(schema, `query { sentence (input: "${sentence}") }`);
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: sentence }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, `query { sentence (input: "${_.repeat(sentence, 20)}") }`),
    ).toEqual({ errors: [new TypeError('sentence length exceeds the maximum length of 255')] });
    expect(resolve).toHaveBeenCalledTimes(0);

    resolve.mockClear();
    await graphql(schema, 'query($input: Sentence) { sentence (input: $input) }', undefined, undefined, { input: sentence });
    expect(resolve).toHaveBeenLastCalledWith(
      undefined, { input: sentence }, undefined, expect.anything(),
    );

    resolve.mockClear();
    expect(
      await graphql(schema, 'query($input: Sentence) { sentence (input: $input) }', undefined, undefined, { input: _.repeat(sentence, 20) }),
    ).toEqual({ errors: [new TypeError(
      `Variable "$input" got invalid value "${_.repeat(sentence, 20)}".\nExpected type "Sentence", found "${_.repeat(sentence, 20)}": sentence length exceeds the maximum length of 255`,
    )] });
    expect(resolve).toHaveBeenCalledTimes(0);
  });
});
