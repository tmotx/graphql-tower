import identity from 'lodash/identity';
import split from 'lodash/split';
import omit from 'lodash/omit';
import defaults from 'lodash/defaults';
import defaultTo from 'lodash/defaultTo';
import NodeRSA from 'node-rsa';
import cookie from 'cookie';
import jsonwebtoken from 'jsonwebtoken';

const VERIFICATION_IS_REQUIRED = 10 * 60;
const RENEW_IS_REQUIRED = 5 * 24 * 60 * 60;

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

  refreshToken(data) {
    return this.sign({ data }, { expiresIn: '60d' });
  }

  accessToken(data) {
    return this.sign({ data });
  }

  expressParser(options) {
    const configs = defaults(options, {
      toValues: obj => obj.valueOf(),
      toModel: identity,
      toModelWithVerification: identity,
    });

    return async (req, res, next) => {
      const { toValues, toModel, toModelWithVerification } = configs;

      req.assignUser = (model) => {
        req.user = model;

        const accessToken = this.accessToken(toValues(model));
        res.append('Authorization', accessToken);
        res.append('Set-Cookie', cookie.serialize('access_token', accessToken, { httpOnly: true, maxAge: 60 * 60 * 24 * 7 }));
      };

      let user;
      let renewToken = false;

      try {
        const token = split(req.headers.authorization, / +/i, 2);
        if (token && token.length === 2) {
          const { data, exp } = this.verify(token[1]);
          const expiresOn = exp - (Date.now() / 1000);

          if (expiresOn < VERIFICATION_IS_REQUIRED || token[0] === 'Basic') {
            user = await toModelWithVerification(data);
            renewToken = true;
            if (expiresOn < RENEW_IS_REQUIRED) res.append('X-Refresh-Token', this.refreshToken(toValues(user)));
          } else {
            user = await toModel(data);
          }
        }
      } catch (e) {
        // empty
      }

      try {
        if (user) throw new Error();

        const cookies = cookie.parse(req.headers.cookie || '');
        if (cookies.access_token) {
          const { data, exp } = this.verify(cookies.access_token);
          const expiresOn = exp - (Date.now() / 1000);

          if (expiresOn < VERIFICATION_IS_REQUIRED) {
            user = await toModelWithVerification(data);
            renewToken = true;
          } else {
            user = await toModel(data);
          }
        }
      } catch (e) {
        // empty
      }

      if (user) {
        req.user = user;
        if (renewToken) req.assignUser(user);
      }

      if (next) next();
    };
  }
}
