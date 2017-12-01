import gql from 'graphql-tag';
import { execute, subscribe, GraphQLSchema, GraphQLObjectType, GraphQLInt } from 'graphql';
import { createServer } from 'http';
import ws from 'ws';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer, SubscriptionClient } from 'subscriptions-transport-ws';
import { authentication } from '../middleware';
import Subscription from '../Subscription';

const pubsub = new PubSub();

const subscribeSpy = jest.fn(() => pubsub.asyncIterator('messageAdd'));
const resolveSpy = jest.fn(payload => payload * 2);

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

function notFoundRequestListener(request, response) {
  response.writeHead(404);
  response.end();
}

const httpServer = createServer(notFoundRequestListener);
httpServer.listen();
new SubscriptionServer(options, { server: httpServer, path: '/' }); // eslint-disable-line
const { port } = httpServer.address();

describe('Subscription', () => {
  it('snapshot', async () => {
    const subscription = new Subscription();
    expect(subscription).toMatchSnapshot();
  });

  it('subscribe successfully', async (done) => {
    const results = await subscribe(schema, gql`subscription { onMessageAdd }`, {}, { user: { id: 10 } });
    results.next().then(({ value: { data } }) => {
      expect(data).toEqual({ onMessageAdd: 20 });
      done();
    });

    pubsub.publish('messageAdd', 10);
  });

  it('subscribe when authorization', async (done) => {
    const client = new SubscriptionClient(`ws://localhost:${port}/`, { connectionParams: { token: 'XYZ' } }, ws);
    client.request({ query: 'subscription { onMessageAdd }' }).subscribe({
      next: ({ data }) => {
        expect(data).toEqual({ onMessageAdd: 20 });
        expect(subscribeSpy)
          .toHaveBeenLastCalledWith(undefined, {}, { user: { id: 10 } }, expect.anything());
        expect(resolveSpy)
          .toHaveBeenLastCalledWith(10, {}, { user: { id: 10 } }, expect.anything());
        client.close();
        done();
      },
    });

    setTimeout(() => pubsub.publish('messageAdd', 10), 100);
  });

  it('subscribe when is guest', async (done) => {
    const client = new SubscriptionClient(`ws://localhost:${port}/`, {}, ws);
    client.request({ query: 'subscription { onMessageAdd }' }).subscribe({});
    setTimeout(() => {
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(resolveSpy).toHaveBeenCalledTimes(0);
      client.close();
      done();
    }, 200);

    setTimeout(() => pubsub.publish('messageAdd', 10), 100);
  });
});
