import React from 'react';
import PropTypes from 'prop-types';
import wrapDisplayName from 'recompose/wrapDisplayName';
import thunk from 'graphql-tower-helper/thunk';
import assertResult from 'graphql-tower-helper/assertResult';
import { withApollo } from 'react-apollo';

export default (redirection) => {
  const thunkRedirection = thunk(redirection);
  return Component => withApollo(class WithAuthorized extends React.Component {
    static displayName = wrapDisplayName(Component, 'WithAuthorized');

    static propTypes = {
      client: PropTypes.shape(),
    }

    static defaultProps = {
      client: {},
    }

    state = {
      authorized: false,
    } ;

    componentDidMount() {
      this.onCheckAuthorized();
    }

    onCheckAuthorized() {
      const { client } = this.props;
      if (client.authorized) {
        this.setState({ authorized: true });
        return;
      }

      const redirect = thunkRedirection(this.props);
      assertResult(redirect, new TypeError('redirect is required'));
      window.location = redirect;
    }

    render() {
      const { authorized } = this.state;
      if (!authorized) return null;

      return React.createElement(Component, this.props);
    }
  });
};
