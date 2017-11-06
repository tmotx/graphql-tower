import omit from 'lodash/omit';
import defaults from 'lodash/defaults';
import defaultTo from 'lodash/defaultTo';
import NodeRSA from 'node-rsa';
import jsonwebtoken from 'jsonwebtoken';

const BLACKLISTED = ['acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'exp', 'cnf', 'c_hash', 'iat', 'iss', 'jti', 'nbf', 'nonce'];

export default class JsonWebToken {
  static generateKey() {
    return Buffer.from(new NodeRSA().generateKeyPair().exportKey('pkcs1-private-pem')).toString('base64');
  }

  constructor(env: Object = {}) {
    if (env.PRIVATE_KEY) {
      this.privateKey = Buffer.from(env.PRIVATE_KEY, 'base64');
      this.publicKey = new NodeRSA(this.privateKey).exportKey('pkcs8-public-pem');
      this.algorithm = { algorithm: 'RS256' };
    } else {
      this.privateKey = defaultTo(env.JWT_SECRET, env.HEROKU_APP_ID);
      this.publicKey = this.privateKey;
    }

    if (!this.privateKey) {
      throw new TypeError('PRIVATE_KEY or JWT_SECRET least one is required');
    }

    this.options = {
      expiresIn: defaultTo(env.JWT_EXPIRES_IN, 60 * 60), // one hour in seconds
      issuer: defaultTo(env.JWT_ISSUER, 'jwt'),
      subject: defaultTo(env.JWT_ISSUER, 'jwt'),
      audience: defaultTo(env.JWT_AUDIENCE, 'everyone'),
    };

    return this;
  }

  sign(data: Object, options: Object): String {
    const opt = defaults({}, options, this.options, this.algorithm);
    return jsonwebtoken.sign(omit(data, BLACKLISTED), this.privateKey, opt);
  }

  verify(token: String, options: Object): Object {
    const opt = defaults({}, options, this.options, { algorithms: ['HS256', 'RS256'] });
    return jsonwebtoken.verify(token, this.publicKey, opt);
  }
}
