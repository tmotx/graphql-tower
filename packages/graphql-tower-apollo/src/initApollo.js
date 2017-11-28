import 'isomorphic-unfetch';
import { ApolloClient } from 'apollo-client';
import { split } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { setContext } from 'apollo-link-context';
// https://github.com/apollographql/apollo-client/issues/2591
import { getMainDefinition } from 'apollo-utilities'; // eslint-disable-line
import { InMemoryCache } from 'apollo-cache-inmemory'; // eslint-disable-line
import { thunk } from 'graphql-tower-helper';

function create(cache, {
  httpUri, wsUri, token, context, ...options
} = {}) {
  const thunkToken = thunk(token);

  let link;

  // Create an http link:
  link = new HttpLink({ ...options, uri: httpUri, credentials: 'same-origin' });
  if (token) {
    link = setContext(
      (_, { headers }) => ({ headers: { ...headers, authorization: thunkToken(context) } }),
    ).concat(link);
  }

  if (wsUri && process.browser) {
    // Create a WebSocket link:
    const wsLink = new WebSocketLink({
      ...options,
      uri: wsUri,
      options: { reconnect: true, connectionParams: () => ({ token: thunkToken(context) }) },
    });

    // using the ability to split links, you can send data to each link
    // depending on what kind of operation is being sent
    link = split(({ query }) => {
      const { kind, operation } = getMainDefinition(query);
      return kind === 'OperationDefinition' && operation === 'subscription';
    }, wsLink, link);
  }

  return new ApolloClient({
    connectToDevTools: process.browser,
    ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    link,
    cache: new InMemoryCache().restore(cache),
  });
}

export default function initApollo(cache, options) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) return create(cache, options);

  // Reuse client on the client-side
  if (!initApollo.client) initApollo.client = create(cache, options);

  return initApollo.client;
}
