import request from 'superinstance';
import express from 'express';
import bodyParser from 'body-parser';
import JWT from '../';

const jwt = new JWT({ JWT_SECRET: 'XYZ' });

const toModel = jest.fn();
const toModelWithVerification = jest.fn();
const reqListener = jest.fn();

const server = express();
server.use(bodyParser.json());
server.use(jwt.expressParser({ toModel, toModelWithVerification }));
server.use((req, res) => { reqListener(req); res.send('ok'); });

const app = request(server);

describe('expressParser', () => {
  it('when token is invalid', async () => {
    const { headers } = await app.post().set('authorization', 'XXYYZZ').send();

    expect(headers['set-cookie']).toBeUndefined();
    expect(headers['x-refresh-token']).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(reqListener).not.toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
  });

  it('when next is null', async () => {
    const token = jwt.accessToken({ id: '10' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    await jwt.expressParser()(req);
    expect(req.user).toEqual({ id: '10' });
  });

  it('assignUser', async () => {
    const req = {};
    const res = { append: jest.fn() };

    await jwt.expressParser()(req, res);
    expect(req.user).toBeUndefined();

    req.assignUser({ id: '10' });
    expect(req.user).toEqual({ id: '10' });
    expect(res.append).toHaveBeenCalledWith('Authorization', expect.anything());
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', expect.anything());
  });

  describe('refresh token', () => {
    it('successfully get user', async () => {
      const token = jwt.refreshToken({ id: '10' });
      toModelWithVerification.mockImplementationOnce(values => Promise.resolve(values));

      const { headers } = await app.post().set('authorization', `Basic ${token}`).send();
      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '10' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie'][0]).toEqual(expect.stringContaining('access_token='));
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(jwt.verify(headers.authorization)).toEqual(expect.objectContaining({ data: { id: '10' } }));
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('expiring soon', async () => {
      const token = jwt.accessToken({ id: '10' });
      toModelWithVerification.mockImplementationOnce(values => Promise.resolve(values));

      const { headers } = await app.post().set('authorization', `Basic ${token}`).send();
      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '10' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie'][0]).toEqual(expect.stringContaining('access_token='));
      expect(jwt.verify(headers['x-refresh-token'])).toEqual(expect.objectContaining({ data: { id: '10' } }));
      expect(jwt.verify(headers.authorization)).toEqual(expect.objectContaining({ data: { id: '10' } }));
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('when verify values of token is invalid', async () => {
      const token = jwt.refreshToken({ id: '10' });
      toModelWithVerification.mockImplementationOnce(() => Promise.reject(new Error()));

      const { headers } = await app.post().set('authorization', `Basic ${token}`).send();

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

      const { headers } = await app.post().set('authorization', `Bearer ${token}`).send();
      expect(toModel).toHaveBeenCalledWith({ id: '10' });
      expect(toModel).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('when token is invalid', async () => {
      const { headers } = await app.post().set('authorization', 'Bearer XYZ').send();

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).not.toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });
  });

  describe('cookie', () => {
    it('successfully get user', async () => {
      const token = jwt.accessToken({ id: '10' });
      toModel.mockImplementationOnce(values => Promise.resolve(values));

      const { headers } = await app.post().set('cookie', `access_token=${token}`).send();
      expect(toModel).toHaveBeenCalledWith({ id: '10' });
      expect(toModel).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie']).toBeUndefined();
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });

    it('expiring soon', async () => {
      const token = jwt.sign({ data: { id: '10' } }, { expiresIn: '5m' });
      toModelWithVerification.mockImplementationOnce(values => Promise.resolve(values));

      const { headers } = await app.post().set('cookie', `access_token=${token}`).send();
      expect(toModelWithVerification).toHaveBeenCalledWith({ id: '10' });
      expect(toModelWithVerification).toHaveBeenCalledTimes(1);

      expect(headers['set-cookie'][0]).toEqual(expect.stringContaining('access_token='));
      expect(headers['x-refresh-token']).toBeUndefined();
      expect(jwt.verify(headers.authorization)).toEqual(expect.objectContaining({ data: { id: '10' } }));
      expect(reqListener).toHaveBeenCalledWith(expect.objectContaining({ user: { id: '10' } }));
    });
  });
});
