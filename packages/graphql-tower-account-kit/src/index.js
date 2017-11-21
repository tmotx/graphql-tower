import map from 'lodash/map';
import padStart from 'lodash/padStart';
import crypto from 'crypto';
import { UnauthorizedError } from 'graphql-tower-errors';
import fetch from 'node-fetch';

export default class AccountKit {
  host = 'https://graph.accountkit.com/v1.1';

  static toQueryString(keyValues) {
    return map(keyValues, (value, key) => `${key}=${value}`).join('&');
  }

  constructor(env: Object = {}) {
    this.id = env.ACCOUNTKIT_ID;
    this.secret = env.ACCOUNTKIT_SECRET;

    if (!this.id || !this.secret) {
      throw TypeError('ACCOUNTKIT_ID and ACCOUNTKIT_SECRET is required');
    }
  }

  async getAccessToken(code) {
    try {
      const accessToken = ['AA', this.id, this.secret].join('|');

      const query = AccountKit.toQueryString({
        grant_type: 'authorization_code', code, access_token: accessToken,
      });

      const res = await fetch(`${this.host}/access_token?${query}`);
      const { access_token: token } = await res.json();
      return token;
    } catch (e) {
      throw new UnauthorizedError('AccountKit cannot get access token');
    }
  }

  async getAccountPhone(code) {
    try {
      const token = await this.getAccessToken(code);
      const appsecretProof = crypto.createHmac('sha256', this.secret).update(token).digest('hex');

      const query = AccountKit.toQueryString({
        access_token: token, appsecret_proof: appsecretProof,
      });

      const res = await fetch(`${this.host}/me?${query}`);
      const { phone: { country_prefix: prefix, national_number: mobile } } = await res.json();

      return `${prefix}${padStart(mobile, 13, 0)}`;
    } catch (e) {
      throw new UnauthorizedError('AccountKit cannot get account information');
    }
  }
}
