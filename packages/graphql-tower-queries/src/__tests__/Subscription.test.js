import gql from 'graphql-tag';
import { execute, GraphQLError, GraphQLSchema, GraphQLObjectType, GraphQLInt } from 'graphql';
import { createServer } from 'http';
import ws from 'ws';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer, SubscriptionClient } from 'subscriptions-transport-ws';
import subscribe from '../subscribe';
import { authentication } from '../middleware';
import Subscription from '../Subscription';

const pubsub = new PubSub();

const resolveSpy = jest.fn(payload => payload * 2);
const subscribeSpy = jest.fn(() => pubsub.asyncIterator('messageAdd'));

const OnMessageAdd = class extends Subscription {
  type = GraphQLInt;
  middleware = [authentication];
  resolve = resolveSpy;
  subscribe = subscribeSpy;
};

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({ name: 'Query', fields: { onMessageAdd: new OnMessageAdd() } }),
  subscription: new GraphQLObjectType({ name: 'Subscription', fields: { onMessageAdd: new OnMessageAdd() } }),
});

const options = {
  schema,
  subscribe,
  execute,
  onConnect: params => (params.token ? { user: { id: 10 } } : {}),
};

const httpServer = createServer();
httpServer.listen();
new SubscriptionServer(options, { server: httpServer, path: '/' }); // eslint-disable-line
const { port } = httpServer.address();

describe('Subscription', () => {
  it('snapshot', async () => {
    const subscription = new Subscription();
    expect(subscription).toMatchSnapshot();
  });

  it('subscribe successfully', async () => {
    const results = await subscribe(schema, gql`subscription { onMessageAdd }`, {}, { user: { id: 10 } });

    pubsub.publish('messageAdd', { data: 10 });
    expect(await results.next()).toEqual({ value: { data: { onMessageAdd: 20 } }, done: false });
  });

  it('subscribe successfully with params', async () => {
    const cache = { model: { times: 10, name: 'yutin' } };
    const results1 = await subscribe(schema, gql`subscription { onMessageAdd }`, {}, { user: { id: 10 } });
    const results2 = await subscribe(schema, gql`subscription { onMessageAdd }`, {}, { user: { id: 10 } });

    pubsub.publish('messageAdd', { data: { name: 'yutin' }, contextValue: { cache } });

    expect(await results1.next()).toEqual({ value: { data: { onMessageAdd: null } }, done: false });
    expect(await results2.next()).toEqual({ value: { data: { onMessageAdd: null } }, done: false });
    expect(resolveSpy)
      .toHaveBeenLastCalledWith({ name: 'yutin' }, {}, { user: { id: 10 }, cache }, expect.anything());
    expect(resolveSpy.mock.calls[0][2].cache).toBe(resolveSpy.mock.calls[1][2].cache);
    expect(resolveSpy).toHaveBeenCalledTimes(2);
  });

  it('throw error on asyncIterator', async () => {
    const throwFn = jest.fn(() => Promise.resolve({}));
    subscribeSpy.mockReturnValueOnce({ next: () => Promise.resolve({}), throw: throwFn });
    const results = await subscribe(schema, gql`subscription { onMessageAdd }`, {}, { user: { id: 10 } });
    await results.throw(new Error());
    expect(throwFn).toHaveBeenLastCalledWith(new Error());
    expect(resolveSpy)
      .toHaveBeenCalledWith(undefined, expect.anything(), expect.anything(), expect.anything());
    expect(resolveSpy).toHaveBeenCalledTimes(1);
  });

  it('when authorization', async () => {
    const client = new SubscriptionClient(`ws://localhost:${port}/`, { connectionParams: { token: 'XYZ' } }, ws);

    let next;
    const promise = new Promise((__) => { next = __; });
    client.request({ query: 'subscription { onMessageAdd }' }).subscribe({ next });

    let newListenerResolve;
    const newListener = new Promise((__) => { newListenerResolve = __; });
    pubsub.ee.once('newListener', newListenerResolve);

    await newListener;

    pubsub.publish('messageAdd', { data: 10 });

    expect(await promise).toEqual({ data: { onMessageAdd: 20 } });
    expect(subscribeSpy)
      .toHaveBeenLastCalledWith(undefined, {}, { user: { id: 10 } }, expect.anything());
    expect(resolveSpy)
      .toHaveBeenLastCalledWith(10, {}, { user: { id: 10 } }, expect.anything());

    client.close();
  });

  it('when is guest', async (done) => {
    const next = jest.fn();

    const client = new SubscriptionClient(`ws://localhost:${port}/`, {}, ws);
    client.request({ query: 'subscription { onMessageAdd }' }).subscribe({ next });

    let newListenerResolve;
    const newListener = new Promise((__) => { newListenerResolve = __; });
    pubsub.ee.once('newListener', newListenerResolve);

    await newListener;

    pubsub.publish('messageAdd', { data: 10 });

    setTimeout(() => {
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(resolveSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(0);
      client.close();
      done();
    }, 100);
  });

  it('when not found path', async () => {
    await expect(subscribe(schema, gql`subscription { today { onMessageAdd } }`))
      .rejects.toEqual(new Error('This subscription is not defined by the schema.'));
  });

  it('when throw GraphQLError', async () => {
    subscribeSpy.mockImplementationOnce(() => { throw new GraphQLError('XYZ'); });
    await expect(subscribe(schema, gql`subscription { onMessageAdd }`))
      .resolves.toEqual({ errors: [new GraphQLError('XYZ')] });
  });
});
