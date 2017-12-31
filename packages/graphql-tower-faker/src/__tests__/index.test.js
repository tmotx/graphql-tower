/* eslint-disable no-console */
import _ from 'lodash';
import { DateTime } from 'luxon';
import opn from 'opn';
import gql from 'graphql-tag';
import {
  graphql,
  subscribe,
  GraphQLNonNull,
  GraphQLList,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLScalarType,
} from 'graphql';
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
  GraphQLInheritanceType,
} from 'graphql-tower-types';
import { isGlobalId, fromGlobalId, toGlobalId } from 'graphql-tower-global-id';
import faker from '../';

jest.useFakeTimers();
jest.mock('opn', () => jest.fn());

console.log = jest.fn();

const resolve = () => { throw new Error(); };

const GraphQLCustom = new GraphQLScalarType({
  name: 'Custom',
  serialize: value => value,
  parseValue: () => null,
  parseLiteral: () => null,
});

const Base = new GraphQLInterfaceType({
  name: 'Base',
  fields: {
    label: { type: GraphQLString },
  },
  resolveType: obj => obj.type,
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLID), resolve },
      int: { type: GraphQLInt, resolve },
      float: { type: GraphQLFloat, resolve },
      string: { type: GraphQLString, resolve },
      boolean: { type: GraphQLBoolean, resolve },
      responseStatus: { type: GraphQLResponseStatus, resolve },
      gid: { type: GraphQLGID, resolve },
      date: { type: GraphQLDate, resolve },
      datetime: { type: GraphQLDateTime, resolve },
      timezone: { type: GraphQLTimeZone, resolve },
      expiration: { type: GraphQLExpiration, resolve },
      sentence: { type: GraphQLSentence, resolve },
      mobile: { type: GraphQLMobile, resolve },
      json: { type: GraphQLJSON, resolve },
      email: { type: GraphQLEmail, resolve },
      gender: { type: GraphQLGender, resolve },
      age: { type: GraphQLAge, resolve },
      list: { type: new GraphQLList(GraphQLInt), resolve },
      custom: { type: GraphQLCustom, resolve },
      members: {
        type: new GraphQLObjectType({
          name: 'MemberPayload',
          fields: {
            totalCount: { type: GraphQLInt, resolve },
            nodes: {
              type: new GraphQLList(new GraphQLObjectType({
                name: 'Member',
                fields: {
                  id: { type: GraphQLGID },
                  email: { type: new GraphQLList(GraphQLEmail) },
                },
              })),
              resolve,
            },
          },
        }),
        args: { first: { type: GraphQLInt } },
        resolve,
      },
      inheritance: {
        type: new GraphQLObjectType({
          name: 'Inheritance',
          fields: {
            base: { type: Base, args: { id: { type: GraphQLGID } }, resolve },
            aaa: {
              type: new GraphQLInheritanceType({
                name: 'AAA',
                interfaces: [Base],
                fields: () => ({ name: { type: GraphQLSentence } }),
              }),
              resolve,
            },
            bbb: {
              type: new GraphQLInheritanceType({
                name: 'BBB',
                interfaces: [Base],
                fields: () => ({ numberOfView: { type: GraphQLInt } }),
              }),
              resolve,
            },
          },
        }),
        resolve: () => ({}),
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      onMessageAdd: {
        type: GraphQLInt,
        subscribe: () => {},
      },
    },
  }),
});

describe('faker', () => {
  let server;

  beforeEach(() => { server = faker(schema); });

  afterEach(() => server.close());

  it('query', async () => {
    const { data } = await graphql(schema, `
      query {
        id, int, float, string, boolean,
        responseStatus gid date datetime timezone
        expiration sentence mobile json email
        gender age list custom
        inheritance { base { __typename label } aaa { label name } bbb { label numberOfView } }
      }
    `);

    const {
      id, int, float, string, boolean,
      responseStatus, gid, date, datetime, timezone,
      expiration, sentence, mobile, json, email,
      gender, age, list, custom,
      inheritance: { base, aaa, bbb },
    } = data;

    expect(id).toEqual(expect.stringMatching(/^[\w=]+$/));
    expect(int).toEqual(expect.any(Number));
    expect(float).toEqual(expect.any(Number));
    expect(string).toEqual(expect.any(String));
    expect(boolean).toEqual(expect.any(Boolean));
    expect(['ok', 'failed']).toContain(responseStatus);
    expect(isGlobalId(gid)).toBe(true);
    expect(date).toBe(new Date().toISOString().substr(0, 10));
    expect(datetime).toEqual(expect.stringContaining(new Date().toISOString().substr(0, 19)));
    expect(timezone).toEqual(expect.stringMatching(/^[+-](?:2[0-3]|[01][0-9]):[0-5][0-9]$/));
    try {
      expect(expiration).toBe(false);
    } catch (e) {
      expect(DateTime.fromISO(expiration) > DateTime.local()).toBe(true);
    }
    expect(sentence).toEqual(expect.any(String));
    expect(mobile).toEqual(expect.stringMatching(/^8860{4}[0-9]{9}$/));
    expect(json).toEqual(expect.any(Object));
    expect(email).toEqual(expect.stringMatching(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/));
    expect(['male', 'female']).toContain(gender);
    expect(age).toEqual(expect.any(Number));
    expect(list).toEqual(_.map(_.range(1000), () => expect.any(Number)));
    expect(custom).toBe('<Custom>');
    expect(base.label).toEqual(expect.any(String));
    expect(['AAA', 'BBB']).toContain(_.get(base, ['__typename']));
    expect(aaa.name).toEqual(expect.any(String));
    expect(bbb.numberOfView).toEqual(expect.any(Number));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Not Found Custom Type.'));

    await new Promise(process.nextTick);

    jest.runOnlyPendingTimers();
    expect(opn).toHaveBeenCalledWith(expect.stringContaining('http://localhost'));
  });

  it('query node and set id', async () => {
    const { data } = await graphql(schema, `
      query ($id: GlobalID) {
        inheritance { base (id: $id) { __typename label } }
      }
    `, {}, {}, { id: toGlobalId('BBB', 123123) });

    expect(data.inheritance.base).toEqual({
      __typename: 'BBB',
      label: expect.any(String),
    });
  });

  it('query list and set first', async () => {
    const { data } = await graphql(schema, `
      query ($first: Int) {
        members (first: $first) {
          totalCount
          nodes { id email }
        }
      }
    `, {}, {}, { first: 30 });

    expect(data.members.nodes.length).toBe(30);
    expect(fromGlobalId(data.members.nodes[0].id).type).toBe('Member');
  });

  it('subscription', async () => {
    const results = await subscribe(schema, gql`subscription { onMessageAdd }`);

    await new Promise(process.nextTick);

    jest.runOnlyPendingTimers();
    expect(await results.next())
      .toEqual({ value: { data: { onMessageAdd: expect.any(Number) } }, done: false });
  });
});
