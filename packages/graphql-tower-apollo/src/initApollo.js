import 'isomorphic-unfetch';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
// https://github.com/apollographql/apollo-client/issues/2591
import { InMemoryCache } from 'apollo-cache-inmemory'; // eslint-disable-line

let apolloClient = null;

function create(cache, { token } = {}) {
  const httpLink = new HttpLink({ credentials: 'same-origin' });
  const authLink = setContext((_, { headers }) =>
    ({ headers: { ...headers, authorization: token } }));

  return new ApolloClient({
    connectToDevTools: process.browser,
    ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    link: token ? authLink.concat(httpLink) : httpLink,
    cache: new InMemoryCache().restore(cache),
  });
}

export default function initApollo(cache, options) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) return create(cache, options);

  // Reuse client on the client-side
  if (!apolloClient) apolloClient = create(cache, options);

  return apolloClient;
}
