/**
 * @jest-environment jsdom
 */
import React from 'react';
import gql from 'graphql-tag';
import { mount } from 'enzyme';
import { graphql } from 'react-apollo';
import { fetch } from 'node-fetch';
import { withData } from '../';

class App extends React.Component {
  static async getInitialProps() {
    return { value: 99 };
  }

  render() {
    return (<div />);
  }
}

describe('withData', () => {
  describe('process.browser is false', () => {
    beforeEach(() => { process.browser = false; });

    it('successfully render', () => {
      const WrapApp = withData()(graphql(gql`query { me { id } }`)(App));
      const component = mount(<WrapApp />);
      expect(component).toMatchSnapshot();
    });

    it('getInitialProps without token', async () => {
      fetch.mockReturnValueOnce(Promise.resolve({ data: { me: { __typename: 'User', id: '10' } } }));
      const WrapApp = withData()(graphql(gql`query { me { id } }`)(App));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(fetch.mock.calls).toMatchSnapshot();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('getInitialProps with token', async () => {
      fetch.mockReturnValueOnce(Promise.resolve({ data: { me: { __typename: 'User', id: '10' } } }));
      const WrapApp = withData({ token: ({ cookie }) => cookie })(graphql(gql`query { me { id } }`)(App));
      expect(await WrapApp.getInitialProps({ cookie: 'key of token' })).toMatchSnapshot();
      expect(fetch.mock.calls).toMatchSnapshot();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('when no getInitialProps', async () => {
      const WrapApp = withData()(graphql(gql`query { me { id } }`)(<div />));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('process.browser is true', () => {
    beforeEach(() => { process.browser = true; });

    it('successfully render', () => {
      const WrapApp = withData()(graphql(gql`query { me { id } }`)(App));
      const component = mount(<WrapApp />);
      expect(component).toMatchSnapshot();
    });

    it('getInitialProps without token', async () => {
      const WrapApp = withData()(graphql(gql`query { me { id } }`)(App));
      expect(await WrapApp.getInitialProps()).toMatchSnapshot();
      expect(fetch).toHaveBeenCalledTimes(0);
    });

    it('getInitialProps with token', async () => {
      const WrapApp = withData({ token: ({ cookie }) => cookie })(graphql(gql`query { me { id } }`)(App));
      expect(await WrapApp.getInitialProps({ cookie: 'key of token' })).toMatchSnapshot();
      expect(fetch).toHaveBeenCalledTimes(0);
    });
  });
});
