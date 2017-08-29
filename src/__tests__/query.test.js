import _ from 'lodash';
import faker from 'faker';
import { graphql, GraphQLInt, GraphQLSchema, GraphQLObjectType } from 'graphql';
import Query, { PayloadField, QueryWithNode, QueryWithConnection } from '../query';

describe('query', () => {
  it('Query', async () => {
    const data = { id: faker.random.number() };
    const resolve = jest.fn(() => Promise.resolve(data));

    const QueryNode = class extends Query {};
    const queryNode = new QueryNode();
    expect(queryNode).toMatchSnapshot();
    expect(await queryNode.resolve()).toBeUndefined();

    const QueryResolve = class extends Query {
      type = GraphQLInt;
      resolve = resolve;
    };
    const queryResolve = new QueryResolve();
    resolve.mockClear();
    expect(await queryResolve.resolve()).toEqual(data);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(queryResolve.node).toEqual(GraphQLInt);

    const queryExtend = _.extend({}, queryResolve);
    expect(queryExtend.node).toBeUndefined();
    expect(queryExtend.resolve).not.toBeUndefined();
  });

  it('Query setup middleware', async () => {
    const data = { id: faker.random.number() };
    const resolve = jest.fn(() => Promise.resolve(data));
    const middleware = jest.fn();

    const QueryMiddleware = class extends Query {
      middleware = middleware;
      resolve = resolve;
    };
    const queryMiddleware = new QueryMiddleware();

    middleware.mockClear();
    resolve.mockClear();
    expect(await queryMiddleware.resolve()).toEqual(data);
    expect(middleware).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);

    const middlewarePromise = [];
    const QueryDeepMiddleware = class extends QueryMiddleware {
      middleware = [
        () => new Promise(done => setImmediate(() => {
          middlewarePromise.push(1);
          done();
        })),
        () => (middlewarePromise.push(2)),
      ];
      resolve = resolve;
    };
    const queryDeepMiddleware = new QueryDeepMiddleware();

    middleware.mockClear();
    resolve.mockClear();
    expect(await queryDeepMiddleware.resolve()).toEqual(data);
    expect(middleware).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(middlewarePromise).toEqual([1, 2]);

    expect(() => {
      const QueryFailed = class extends Query {
        middleware = faker.lorem.word();
        resolve = resolve;
      };
      const queryFailed = new QueryFailed();
      queryFailed.resolve();
    }).toThrowError('middleware a function array is required');
  });

  it('Query setup afterware', async () => {
    const data = { id: faker.random.number() };
    const reply = { id: faker.random.number() };
    const resolve = jest.fn(() => Promise.resolve(data));
    const afterware = jest.fn(() => Promise.resolve(reply));

    const QueryAfterware = class extends Query {
      afterware = afterware;
      resolve = resolve;
    };
    const queryAfterware = new QueryAfterware();

    expect(await queryAfterware.resolve()).toEqual(reply);
    expect(afterware).toHaveBeenCalledTimes(1);
    expect(afterware.mock.calls[0][1]).toEqual({});
    expect(afterware).toHaveBeenLastCalledWith(undefined, {}, undefined, undefined, data);
    expect(resolve).toHaveBeenCalledTimes(1);

    const QueryDeepAfterware = class extends QueryAfterware {
      afterware = [
        (payload, args, context, info, results) => new Promise(done => setImmediate(() => {
          done([results, 1]);
        })),
        (payload, args, context, info, results) => _.flatten([results, 2]),
      ];;
      resolve = resolve;
    };
    const queryDeepAfterware = new QueryDeepAfterware();

    afterware.mockClear();
    resolve.mockClear();
    expect(await queryDeepAfterware.resolve()).toEqual([reply, 1, 2]);
    expect(afterware).toHaveBeenCalledTimes(1);
    expect(afterware).toHaveBeenLastCalledWith(undefined, {}, undefined, undefined, data);
    expect(resolve).toHaveBeenCalledTimes(1);

    expect(() => {
      const QueryFailed = class extends Query {
        afterware = faker.lorem.word();
        resolve = resolve;
      };
      const queryFailed = new QueryFailed();
      queryFailed.resolve();
    }).toThrowError('afterware a function array is required');
  });

  it('Payload', async () => {
    const resolve = jest.fn((payload, { id }) => id);
    const QueryNode = class extends Query {
      type = GraphQLInt;
      resolve = resolve;
    };

    const fieldId = faker.random.number();
    const tempId = faker.random.number();
    const value = faker.random.number();

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: {
            type: new GraphQLObjectType({
              name: 'Node',
              fields: {
                field: new QueryNode({ id: new PayloadField() }),
                custom: new QueryNode({ id: new PayloadField('tempId') }),
                value: new QueryNode({ id: value }),
              },
            }),
            resolve: () => ({ id: fieldId, tempId }),
          },
        },
      }),
    });

    const result = await graphql(schema, 'query { node { field custom value } }');
    expect(result.data.node).toEqual({ field: fieldId, custom: tempId, value });
  });

  it('QueryWithNode', async () => {
    const resolve = jest.fn((payload, { id }) => id);
    const QueryNode = class extends QueryWithNode {
      type = GraphQLInt;
      resolve = resolve;
    };

    const query = new QueryNode();
    expect(query).toMatchSnapshot();

    const fieldId = faker.random.number();
    const tempId = faker.random.number();

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: {
            type: new GraphQLObjectType({
              name: 'Node',
              fields: {
                field: query,
                custom: new QueryNode('tempId'),
                empty: new QueryNode(),
              },
            }),
            resolve: () => ({ fieldId, tempId }),
          },
        },
      }),
    });

    const result = await graphql(schema, 'query { node { field custom empty } }');
    expect(result.data.node).toEqual({ field: fieldId, custom: tempId, empty: null });
  });

  it('QueryWithConnection', async () => {
    const resolve = jest.fn();
    const QueryConnection = class extends QueryWithConnection {
      type = GraphQLInt;
      args = { id: { type: GraphQLInt } };
      resolve = resolve;
    };

    const query = new QueryConnection();
    expect(query).toMatchSnapshot();

    expect(query.node).toEqual(GraphQLInt);

    const queryExtend = _.extend({}, query);
    expect(queryExtend.node).toBeUndefined();
    expect(queryExtend.args).not.toBeUndefined();
    expect(queryExtend.type).not.toBeUndefined();
    expect(queryExtend.resolve).not.toBeUndefined();

    const first = faker.random.number();
    const offset = faker.random.number();
    const after = faker.lorem.word();
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { connection: query },
      }),
    });

    const reply = [faker.random.number(), faker.random.number()];

    resolve.mockReturnValueOnce(reply);
    const result = await graphql(schema, `
      query ($first: Int $offset: Int $after: String) {
        connection (first: $first offset: $offset after: $after)
      }`, {}, {}, { first, offset, after });

    expect(result.data.connection).toEqual(reply);
  });
});
