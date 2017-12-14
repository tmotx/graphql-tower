import _ from 'lodash';
import request from 'superinstance';
import http from 'http';
import ws from 'ws';
import { execute, subscribe, GraphQLSchema, GraphQLObjectType, GraphQLInt } from 'graphql';
import express from 'express';
import bodyParser from 'body-parser';
import { SubscriptionServer, SubscriptionClient } from 'subscriptions-transport-ws';
import JWT from '../';

const toModel = jest.fn(values => Promise.resolve(values));
const toModelWithVerification = jest.fn(values => Promise.resolve(values));
const reqListener = jest.fn();

const jwt = new JWT({ JWT_SECRET: 'XYZ' }, { toModel, toModelWithVerification });

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(jwt.expressParser());
app.use((req, res) => { reqListener(req); res.send('ok'); });

const req = request(server);

const resolve = jest.fn(() => 1);
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({ name: 'Query', fields: { me: { type: GraphQLInt, resolve } } }),
});

new SubscriptionServer({ schema, subscribe, execute, onConnect: jwt.subscriptionParser() }, { server, path: '/' }); // eslint-disable-line

describe('expressParser', () => {
  it('when token is invalid', async () => {
    const { headers } = await req.post().set('authorization', 'Basic XXYYZZ').send();

    expect(headers['set-cookie']).toBeUndefined();
    expect(headers['x-refresh-token']).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(reqListener).not.toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
  });

  it('when next is null', async () => {
    const token = jwt.accessToken({ id: '10' });
    const clientReq = { headers: { authorization: `Bearer ${token}` } };
    await jwt.expressParser()(clientReq);
    expect(clientReq.user).toEqual({ id: '10' });
  });

  it('assignUser', async () => {
    const clientReq = {};
    const serverRes = { append: jest.fn() };

    await jwt.expressParser()(clientReq, serverRes);
    expect(clientReq.user).toBeUndefined();

    clientReq.assignUser({ id: '10' });
    expect(clientReq.user).toEqual({ id: '10' });
    expect(serverRes.append).toHaveBeenCalledWith('X-Refresh-Token', expect.anything());
    expect(serverRes.append).toHaveBeenCalledWith('Authorization', expect.anything());
    expect(serverRes.append).toHaveBeenCalledWith('Set-Cookie', expect.anything());
  });

  describe('refresh token', () => {
    it('successfully get user', async () => {
      const token = jwt.refreshToken({ id: '10' });

      const { headers } = await req.post().set('authorization', `Bearer ${token}`).send();
      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '10' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie'][0]).toEqual(expect.stringContaining('access_token='));
      expect(headers['x-refresh-token']).not.toBeUndefined();
      expect(jwt.verify(headers.authorization)).toEqual(expect.objectContaining({ data: { id: '10' } }));
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('when verify values of token is invalid', async () => {
      const token = jwt.refreshToken({ id: '10' });
      toModelWithVerification.mockImplementationOnce(() => Promise.reject(new Error()));

      const { headers } = await req.post().set('authorization', `Bearer ${token}`).send();

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).not.toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('expired', async () => {
      const token = jwt.sign({ data: { id: '10' } }, { expiresIn: 0 });

      const { headers } = await req.post().set('authorization', `Bearer ${token}`).send();

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).not.toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });
  });

  describe('access token', () => {
    it('successfully get user', async () => {
      const token = jwt.accessToken({ id: '10' });
      toModel.mockImplementationOnce(values => Promise.resolve(values));

      const { headers } = await req.post().set('authorization', `Bearer ${token}`).send();
      expect(toModel).toHaveBeenCalledWith({ id: '10' });
      expect(toModel).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('when token is invalid', async () => {
      const { headers } = await req.post().set('authorization', 'Bearer XYZ').send();

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).not.toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });
  });

  describe('cookie', () => {
    it('successfully get user', async () => {
      const token = jwt.accessToken({ id: '10' });

      const { headers } = await req.post().set('cookie', `access_token=${token}`).send();
      expect(toModel).toHaveBeenCalledWith({ id: '10' });
      expect(toModel).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('expired', async () => {
      const token = jwt.sign({ data: { id: '10' } }, { expiresIn: 0 });
      const refreshToken = jwt.refreshToken({ id: '20' });

      const { headers } = await req.post().set('cookie', `access_token=${token}`).set('authorization', `Bearer ${refreshToken}`).send();
      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '20' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie'][0]).toEqual(expect.stringContaining('access_token='));
      expect(headers['x-refresh-token']).not.toBeUndefined();
      expect(headers.authorization).not.toBeUndefined();
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '20' } }));
    });
  });
});

describe('subscriptionParser', () => {
  describe('connectionParams', () => {
    const connect = async (token) => {
      const socket = new SubscriptionClient(
        `ws://127.0.0.1:${server.address().port}/`,
        { connectionParams: { authorization: `Bearer ${token}` } },
        ws,
      );

      let onConnected;
      const promiseConnected = new Promise((__) => { onConnected = __; });
      socket.onConnected(onConnected);

      await promiseConnected;

      let next;
      const promiseNext = new Promise((__) => { next = __; });
      socket.request({ query: 'query { me }' }).subscribe({ next });

      await promiseNext;

      return socket;
    };

    it('successfully get user use refreshToken', async () => {
      const token = jwt.refreshToken({ id: '10' });

      const socket = await connect(token);

      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '10' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(resolve)
        .toHaveBeenLastCalledWith(undefined, {}, expect.objectContaining({ user: { id: '10' } }), expect.anything());

      socket.close();
    });

    it('successfully get user use accessToken', async () => {
      const token = jwt.accessToken({ id: '10' });

      const socket = await connect(token);

      expect(toModel).toHaveBeenCalledWith({ id: '10' });
      expect(toModel).toHaveBeenCalledTimes(1);

      expect(resolve)
        .toHaveBeenLastCalledWith(undefined, {}, expect.objectContaining({ user: { id: '10' } }), expect.anything());

      socket.close();
    });

    it('when token is invalid', async () => {
      const socket = await connect('');

      expect(resolve)
        .not.toHaveBeenLastCalledWith(undefined, {}, expect.objectContaining({ user: { id: '10' } }), expect.anything());

      socket.close();
    });
  });

  describe('cookie', () => {
    const connect = async (cookie, token) => {
      const WebSocket = _.assign((...args) => (new ws(...args, { headers: { cookie } })), ws); // eslint-disable-line

      const socket = new SubscriptionClient(
        `ws://127.0.0.1:${server.address().port}/`,
        { connectionParams: { authorization: `Bearer ${token}` } },
        WebSocket,
      );

      let onConnected;
      const promiseConnected = new Promise((__) => { onConnected = __; });
      socket.onConnected(onConnected);

      await promiseConnected;

      let next;
      const promiseNext = new Promise((__) => { next = __; });
      socket.request({ query: 'query { me }' }).subscribe({ next });

      await promiseNext;

      return socket;
    };

    it('successfully get user', async () => {
      const token = jwt.accessToken({ id: '10' });

      const socket = await connect(`access_token=${token}`);

      expect(toModel).toHaveBeenCalledWith({ id: '10' });
      expect(toModel).toHaveBeenCalledTimes(1);

      expect(resolve)
        .toHaveBeenLastCalledWith(undefined, {}, expect.objectContaining({ user: { id: '10' } }), expect.anything());

      socket.close();
    });

    it('expired', async () => {
      const token = jwt.sign({ data: { id: '10' } }, { expiresIn: 0 });
      const refreshToken = jwt.refreshToken({ id: '20' });

      const socket = await connect(`access_token=${token}`, refreshToken);

      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '20' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(resolve)
        .toHaveBeenLastCalledWith(undefined, {}, expect.objectContaining({ user: { id: '20' } }), expect.anything());

      socket.close();
    });

    it('when token is invalid', async () => {
      const token = jwt.sign({ data: { id: '10' } }, { expiresIn: 0 });

      const socket = await connect(`access_token=${token}`);

      expect(resolve)
        .not.toHaveBeenLastCalledWith(undefined, {}, expect.objectContaining({ user: { id: '10' } }), expect.anything());

      socket.close();
    });
  });
});
