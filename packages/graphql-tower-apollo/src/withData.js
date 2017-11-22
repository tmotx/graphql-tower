import React from 'react';
import PropTypes from 'prop-types';
import { thunk, displayName } from 'graphql-tower-helper';
import { ApolloProvider, getDataFromTree } from 'react-apollo';
import Head from 'next/head';
import initApollo from './initApollo';

export default ({ token } = {}) => {
  const thunkToken = thunk(token);

  return Component => class WithData extends React.Component {
    static displayName = `WithData(${displayName(Component)})`;

    static propTypes = {
      cache: PropTypes.shape(),
    };

    static defaultProps = {
      cache: {},
    }

    static async getInitialProps(context) {
      let cache = {};

      const apollo = initApollo({}, { token: thunkToken(context) });

      // Evaluate the composed component's getInitialProps()
      let props = {};
      if (Component.getInitialProps) {
        props = await Component.getInitialProps(context, apollo);
      }

      // Run all GraphQL queries in the component tree
      // and extract the resulting data
      if (!process.browser) {
        try {
          // Run all GraphQL queries
          await getDataFromTree(
            <ApolloProvider client={apollo}>
              <Component {...props} />
            </ApolloProvider>,
          );
        } catch (error) {
          // Prevent Apollo Client GraphQL errors from crashing SSR.
          // Handle them in components via the data.error prop:
          // http://dev.apollodata.com/react/api-queries.html#graphql-query-data-error
        }
        // getDataFromTree does not call componentWillUnmount
        // head side effect therefore need to be cleared manually
        Head.rewind();

        // Extract query data from the Apollo store
        cache = apollo.cache.extract();
      }

      return { cache, ...props };
    }

    componentWillMount() {
      this.apollo = initApollo(this.props.cache);
    }

    render() {
      return (
        <ApolloProvider client={this.apollo}>
          <Component {...this.props} />
        </ApolloProvider>
      );
    }
  };
};
