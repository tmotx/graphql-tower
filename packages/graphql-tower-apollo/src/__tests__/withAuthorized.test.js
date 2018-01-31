import fp from 'lodash/fp';
import React from 'react';
import { shallow } from 'enzyme';
import { withAuthorized } from '../';

jest.useFakeTimers();

window = {};

describe('withAuthorized', () => {
  it('no authorization', async () => {
    const App = fp.compose(
      withAuthorized({ redirect: '/login' }),
    )(() => <div />);

    window.location = '';

    const app = shallow(<App />, { context: { client: {} } });

    expect(app.diveTo('WithAuthorized(Component)')).toMatchSnapshot();
    expect(window.location).toBe('/login');
  });

  it('disabled', async () => {
    const App = fp.compose(
      withAuthorized({ redirect: '/login', disabled: true }),
    )(() => <div />);

    window.location = '';

    const app = shallow(<App />, { context: { client: {} } });

    expect(app.diveTo('WithAuthorized(Component)')).toMatchSnapshot();
    expect(window.location).toBe('');
  });

  it('authorized', async () => {
    const App = fp.compose(
      withAuthorized({ redirect: '/login' }),
    )(() => (<div />));

    window.location = '';

    const app = shallow(<App />, { context: { client: { authorized: true } } });
    expect(app.diveTo('WithAuthorized(Component)')).toMatchSnapshot();
    expect(window.location).toBe('');
  });

  it('when redirect is null', () => {
    const App = fp.compose(
      withAuthorized(),
    )(() => <div />);

    const app = shallow(<App />, { context: { client: {} } });

    expect(() => app.diveTo('WithAuthorized(Component)'))
      .toThrowError(new TypeError('redirect is required'));
  });
});
