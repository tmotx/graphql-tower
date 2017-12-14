import identity from 'lodash/identity';
import omit from 'lodash/omit';
import defaults from 'lodash/defaults';
import defaultTo from 'lodash/defaultTo';
import NodeRSA from 'node-rsa';
import cookie from 'cookie';
import jsonwebtoken from 'jsonwebtoken';

const VERIFICATION_IS_REQUIRED = 60 * 60; // one hour in seconds

const BLACKLISTED = ['acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'exp', 'cnf', 'c_hash', 'iat', 'iss', 'jti', 'nbf', 'nonce'];

export default class JsonWebToken {
  static generateKey() {
    return Buffer.from(new NodeRSA().generateKeyPair().exportKey('pkcs1-private-pem')).toString('base64');
  }

  constructor(env: Object = {}, handlers = {}) {
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
      expiresIn: defaultTo(env.JWT_EXPIRES_IN, VERIFICATION_IS_REQUIRED), // one hour in seconds
      issuer: defaultTo(env.JWT_ISSUER, 'jwt'),
      subject: defaultTo(env.JWT_ISSUER, 'jwt'),
      audience: defaultTo(env.JWT_AUDIENCE, 'everyone'),
    };

    const { toValues, toModel, toModelWithVerification } = defaults(handlers, {
      toValues: obj => obj.valueOf(),
      toModel: identity,
      toModelWithVerification: identity,
    });

    this.toValues = toValues;
    this.toModel = toModel;
    this.toModelWithVerification = toModelWithVerification;

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

  refreshToken(data, hash) {
    return this.sign({ data, hash }, { expiresIn: '60d' });
  }

  accessToken(data) {
    return this.sign({ data });
  }

  async fetchModel(token) {
    const { toModel, toModelWithVerification } = this;
    const { data, exp } = this.verify(token);
    const expiresOn = exp - (Date.now() / 1000);

    const renewToken = expiresOn > VERIFICATION_IS_REQUIRED;

    const model = await (renewToken ? toModelWithVerification(data) : toModel(data));

    return { model, renewToken };
  }

  expressParser() {
    return async (req, res, next) => {
      const { toValues } = this;

      req.assignUser = (model) => {
        req.user = model;

        const accessToken = this.accessToken(toValues(model));
        res.append('X-Refresh-Token', this.refreshToken(toValues(model)));
        res.append('Authorization', accessToken);
        res.append('Set-Cookie', cookie.serialize('access_token', accessToken, { httpOnly: true, maxAge: 60 * 60 * 24 * 7 }));
      };

      try {
        const cookies = cookie.parse(req.headers.cookie || '');
        if (cookies.access_token) {
          req.user = (await this.fetchModel(cookies.access_token)).model;
        }
      } catch (e) {
        // empty
      }

      try {
        if (req.user) throw new Error();

        const token = /^Bearer (.+)$/.exec(req.headers.authorization);
        if (token) {
          const { model, renewToken } = await this.fetchModel(token[1]);
          req.user = model;

          if (renewToken) req.assignUser(model);
        }
      } catch (e) {
        // empty
      }

      if (next) next();
    };
  }
}
