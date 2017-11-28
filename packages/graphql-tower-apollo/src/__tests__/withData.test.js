/**
 * @jest-environment jsdom
 */
import React from 'react';
import http from 'http';
import gql from 'graphql-tag';
import express from 'express';
import ws from 'ws';
import bodyParser from 'body-parser';
import { subscribe, GraphQLID, GraphQLString, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { mount } from 'enzyme';
import { graphql } from 'react-apollo';
import { execute } from 'apollo-link';
import { graphqlExpress } from 'apollo-server-express';
import { Query } from 'graphql-tower-queries';
import { withData, initApollo } from '../';

jest.unmock('node-fetch');

const pubsub = new PubSub();

const resolveSpy = jest.fn(payload => payload * 2);

const subscribeSpy = jest.fn(() => pubsub.asyncIterator('me'));

const User = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const Me = class extends Query {
  type = User;
  resolve = resolveSpy;
  subscribe = subscribeSpy;
};

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({ name: 'Query', fields: { me: new Me() } }),
  subscription: new GraphQLObjectType({ name: 'Subscription', fields: { me: new Me() } }),
});

const app = express();
app.use('/graphql', bodyParser.json(), graphqlExpress(req => ({ schema, context: req.headers.authorization })));

const server = http.createServer(app);
server.listen();
const { port } = server.address();

new SubscriptionServer( // eslint-disable-line
  {
    schema, subscribe, execute, onConnect: params => (params : {}),
  },
  { server, path: '/' },
);

class App extends React.Component {
  static async getInitialProps() {
    return { value: 99 };
  }

  render() {
    return (<div />);
  }
}

const apollo = {
  httpUri: `http://localhost:${port}/graphql`,
  wsUri: `ws://localhost:${port}/`,
  webSocketImpl: ws,
};

describe('withData', () => {
  describe('process.browser is false', () => {
    beforeEach(() => { process.browser = false; });

    it('getInitialProps without cookie', async () => {
      resolveSpy.mockReturnValueOnce(Promise.resolve({ id: '50', name: 'hello' }));
      const WrapApp = withData(apollo)(graphql(gql`query { me { id name } }`)(App));

      const props = await WrapApp.getInitialProps();
      expect(props).toMatchSnapshot();

      expect(resolveSpy.mock.calls).toMatchSnapshot();
      expect(resolveSpy).toHaveBeenCalledTimes(1);

      const component = mount(<WrapApp {...props} />);
      expect(component).toMatchSnapshot();
    });

    it('getInitialProps with cookie', async () => {
      resolveSpy.mockReturnValueOnce(Promise.resolve({ id: '50', name: 'hello' }));
      const WrapApp = withData({ ...apollo, token: ({ cookie }) => cookie })(graphql(gql`query { me { id name } }`)(App));

      const props = await WrapApp.getInitialProps({ cookie: 'key of token' });
      expect(props).toMatchSnapshot();
      expect(resolveSpy.mock.calls).toMatchSnapshot();
      expect(resolveSpy).toHaveBeenCalledTimes(1);

      const component = mount(<WrapApp {...props} />);
      expect(component).toMatchSnapshot();
    });

    it('when no getInitialProps', async () => {
      const WrapApp = withData(apollo)(graphql(gql`query { me { id name } }`)(() => <div />));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(resolveSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('process.browser is true', () => {
    beforeEach(() => { process.browser = true; });

    it('getInitialProps without token', async () => {
      const WrapApp = withData(apollo)(graphql(gql`query { me { id name } }`)(App));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(resolveSpy).toHaveBeenCalledTimes(0);
    });

    it('getInitialProps with token', async () => {
      const WrapApp = withData({ ...apollo, token: 'key of token' })(graphql(gql`query { me { id name } }`)(App));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(resolveSpy).toHaveBeenCalledTimes(0);
    });

    it('has not websocket', async () => {
      const WrapApp = withData({ ...apollo, wsUri: undefined })(graphql(gql`query { me { id name } }`)(App));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(resolveSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('initApollo', () => {
    beforeEach(() => {
      process.browser = true;
      initApollo.client = null;
    });

    it('init', async () => {
      expect(initApollo()).toMatchSnapshot();
      expect(initApollo()).toBe(initApollo());
    });

    it('subscription', async (done) => {
      const client = initApollo({}, { ...apollo, token: 'key of token' });
      execute(client.link, { query: gql`subscription { me { id name } }` }).subscribe({});
      setTimeout(() => {
        expect(subscribeSpy.mock.calls).toMatchSnapshot();
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        done();
      }, 100);
    });

    it('query', async (done) => {
      const client = initApollo({}, { ...apollo, token: 'key of token' });
      execute(client.link, { query: gql`query { me { id name } }` }).subscribe({});
      setTimeout(() => {
        expect(resolveSpy.mock.calls).toMatchSnapshot();
        expect(resolveSpy).toHaveBeenCalledTimes(1);
        done();
      }, 100);
    });
  });
});
