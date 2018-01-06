import React from 'react';
import PropTypes from 'prop-types';
import { displayName } from 'graphql-tower-helper';
import { ApolloProvider, getDataFromTree } from 'react-apollo';
import Head from 'next/head';
import initApollo from './initApollo';

export default options => Component => class WithData extends React.Component {
  static displayName = `WithData(${displayName(Component)})`;

  static propTypes = {
    cache: PropTypes.shape(),
  };

  static defaultProps = {
    cache: {},
  }

  static getInitialProps(context) {
    const apollo = initApollo({}, { context, ...options });

    return Promise.resolve()
      .then(() => {
        // Evaluate the composed component's getInitialProps()
        if (Component.getInitialProps) {
          return Component.getInitialProps(context, apollo);
        }

        return {};
      })
      .then((props) => {
        // Run all GraphQL queries in the component tree
        // and extract the resulting data
        if (process.browser || options.noSSR) return props;

        // Run all GraphQL queries
        return getDataFromTree(
          <ApolloProvider client={apollo}>
            <Component {...props} />
          </ApolloProvider>,
        ).then(() => {
          // getDataFromTree does not call componentWillUnmount
          // head side effect therefore need to be cleared manually
          Head.rewind();
          // Extract query data from the Apollo store
          return { cache: apollo.cache.extract(), ...props };
        }, () => (
          // Prevent Apollo Client GraphQL errors from crashing SSR.
          // Handle them in components via the data.error prop:
          // http://dev.apollodata.com/react/api-queries.html#graphql-query-data-error
          props
        ));
      });
  }

  componentWillMount() {
    this.apollo = initApollo(this.props.cache, options);
  }

  render() {
    if (!process.browser && options.noSSR) return null;

    return (
      <ApolloProvider client={this.apollo}>
        <Component {...this.props} />
      </ApolloProvider>
    );
  }
};
