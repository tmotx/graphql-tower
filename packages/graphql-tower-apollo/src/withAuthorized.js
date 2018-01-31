import React from 'react';
import PropTypes from 'prop-types';
import wrapDisplayName from 'recompose/wrapDisplayName';
import thunk from 'graphql-tower-helper/thunk';
import assertResult from 'graphql-tower-helper/assertResult';
import { withApollo } from 'react-apollo';

export default (options) => {
  const thunkOption = thunk(options || {});
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
      const { redirect, disabled } = thunkOption(this.props);

      if (client.authorized || disabled) {
        this.setState({ authorized: true });
        return;
      }

      assertResult(redirect, new TypeError('redirect is required'));
      window.location = redirect;
    }

    render() {
      const { disabled } = thunkOption(this.props);
      const { authorized } = this.state;

      if (authorized || disabled) {
        return React.createElement(Component, this.props);
      }

      return null;
    }
  });
};
