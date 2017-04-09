import _ from 'lodash';
import faker from 'faker';
import { GraphQLInt, GraphQLList } from 'graphql';
import Query, { QueryWithConnection } from '../query';

describe('query', () => {
  it('Query', async () => {
    const data = { id: faker.random.number() };
    const resolve = jest.fn(() => Promise.resolve(data));

    const QueryNode = class extends Query {};
    const queryNode = new QueryNode();
    expect(queryNode).toMatchSnapshot();
    expect(await queryNode.resolve()).toBeUndefined();

    const QueryResolve = class extends Query {
      resolve = resolve;
    };
    const queryResolve = new QueryResolve();
    resolve.mockClear();
    expect(await queryResolve.resolve()).toEqual(data);
    expect(resolve).toHaveBeenCalledTimes(1);

    const queryExtend = _.extend({}, queryResolve);
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

    afterware.mockClear();
    resolve.mockClear();
    expect(await queryAfterware.resolve()).toEqual(reply);
    expect(afterware).toHaveBeenCalledTimes(1);
    expect(afterware).toHaveBeenLastCalledWith(undefined, undefined, undefined, undefined, data);
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
    expect(afterware).toHaveBeenLastCalledWith(undefined, undefined, undefined, undefined, data);
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

  it('QueryWithConnection', () => {
    const QueryConnection = class extends QueryWithConnection {
      type = GraphQLInt;
    };
    const query = new QueryConnection();
    expect(query).toMatchSnapshot();

    const queryExtend = _.extend({}, query);
    expect(queryExtend.type).not.toBeUndefined();
    expect(queryExtend.resolve).not.toBeUndefined();
  });
});
