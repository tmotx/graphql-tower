/* eslint no-underscore-dangle: ["error", { "allow": ["_token"] }] */

import 'isomorphic-unfetch';
import cookie from 'cookie';
import get from 'lodash/get';
import { ApolloClient } from 'apollo-client';
import { ApolloLink, split } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { RetryLink } from 'apollo-link-retry';
// https://github.com/apollographql/apollo-client/issues/2591
import { getMainDefinition } from 'apollo-utilities'; // eslint-disable-line
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory'; // eslint-disable-line
import { thunk } from 'graphql-tower-helper';
import localStorage from './localStorage';

function create(cache, {
  httpUri, wsUri,
  headers: takeHeaders, authorization, context,
  cacheResolvers, dataIdFromObject, introspectionQueryResultData,
  ...options
} = {}) {
  let client;

  const thunkHeaders = thunk(takeHeaders);
  const thunkAuthorization = thunk(authorization || ((server) => {
    const cookies = cookie.parse(get(server, ['req', 'headers', 'cookie'], ''));
    if (cookies.access_token) return `Bearer ${cookies.access_token}`;

    const { token } = client;
    if (token) return `Bearer ${token}`;

    return undefined;
  }));

  let link;

  // Create an http link:
  link = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers }) => ({
      headers: {
        ...headers,
        ...thunkHeaders(context, headers),
        authorization: thunkAuthorization(context),
      },
    }));
    return forward(operation).map((response) => {
      const { response: { headers } } = operation.getContext();
      const refreshToken = headers.get('x-refresh-token');
      if (refreshToken) client.token = refreshToken;
      return response;
    });
  }).concat(new HttpLink({ ...options, uri: httpUri, credentials: 'same-origin' }));

  // Create a WebSocket link:
  if (wsUri && process.browser) {
    const wsLink = new WebSocketLink({
      ...options,
      uri: wsUri,
      options: {
        reconnect: true,
        connectionParams: () => ({
          ...thunkHeaders(context),
          authorization: thunkAuthorization(context),
        }),
      },
    });

    // using the ability to split links, you can send data to each link
    // depending on what kind of operation is being sent
    link = split(({ query }) => {
      const { kind, operation } = getMainDefinition(query);
      return kind === 'OperationDefinition' && operation === 'subscription';
    }, wsLink, link);
  }

  const fragmentMatcher = new IntrospectionFragmentMatcher({ introspectionQueryResultData });

  client = new ApolloClient({
    connectToDevTools: process.browser,
    ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    link: new RetryLink().concat(link),
    cache: new InMemoryCache({ cacheResolvers, dataIdFromObject, fragmentMatcher }).restore(cache),
  });

  Object.defineProperty(client, 'token', {
    get() {
      if (client._token) return client._token;
      return localStorage.getItem('graphql-tower-token');
    },
    set(token) {
      client._token = token;
      localStorage.setItem('graphql-tower-token', token);
    },
  });

  Object.defineProperty(client, 'authorized', {
    get() {
      return Boolean(thunkAuthorization(context));
    },
  });

  return client;
}

export default function initApollo(cache, options) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) return create(cache, options);

  // Reuse client on the client-side
  if (!initApollo.client) initApollo.client = create(cache, options);

  return initApollo.client;
}
