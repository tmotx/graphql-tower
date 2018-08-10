import padStart from 'lodash/padStart';
import crypto from 'crypto';
import faker from 'faker';
import { fetch } from 'node-fetch';
import AccountKit from '../';

describe('account kit', () => {
  it('is required', () => {
    expect(() => new AccountKit()).toThrowError(new TypeError('ACCOUNTKIT_ID and ACCOUNTKIT_SECRET is required'));
  });

  describe('get token and phone', () => {
    const code = 'TMOTXYZ';
    const accountKit = new AccountKit({ ACCOUNTKIT_ID: 'tester', ACCOUNTKIT_SECRET: 'server secret' });

    let token;
    beforeEach(() => {
      token = faker.random.uuid();
      fetch.mockReturnValueOnce(Promise.resolve({ access_token: token }));
    });

    it('getAccessToken', async () => {
      const reply = await accountKit.getAccessToken(code);
      expect(reply).toBe(token);
      expect(fetch).toHaveBeenCalledWith(`https://graph.accountkit.com/v1.1/access_token?grant_type=authorization_code&code=${code}&access_token=AA|tester|server secret`);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('getAccessToken when throw Error', async () => {
      fetch.mockReset();
      await expect(accountKit.getAccessToken(code)).rejects.toEqual(new Error('AccountKit cannot get access token'));
    });

    it('getAccountPhone', async () => {
      const prefix = faker.random.number(9990) + 1;
      const mobile = faker.phone.phoneNumber('###########');
      const hash = crypto.createHmac('sha256', 'server secret').update(token).digest('hex');

      fetch.mockReturnValueOnce(Promise.resolve({
        phone: { country_prefix: prefix, national_number: mobile },
      }));

      const reply = await accountKit.getAccountPhone(code);
      expect(reply).toBe(`${prefix}${padStart(mobile, 13, 0)}`);
      expect(fetch).toHaveBeenCalledWith(`https://graph.accountkit.com/v1.1/access_token?grant_type=authorization_code&code=${code}&access_token=AA|tester|server secret`);
      expect(fetch).toHaveBeenCalledWith(`https://graph.accountkit.com/v1.1/me?access_token=${token}&appsecret_proof=${hash}`);
      expect(fetch).toHaveBeenLastCalledWith(`https://graph.accountkit.com/v1.1/logout?access_token=${token}`);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('getAccountPhone when throw Error', async () => {
      await expect(accountKit.getAccountPhone(code)).rejects.toEqual(new Error('AccountKit cannot get account information'));
    });

    it('logout', async () => {
      await accountKit.logout(token);
      expect(fetch).toHaveBeenCalledWith(`https://graph.accountkit.com/v1.1/logout?access_token=${token}`);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('logout when throw Error', async () => {
      await expect(accountKit.logout(token)).rejects.toEqual(new Error('AccountKit cannot logout'));
    });
  });
});
