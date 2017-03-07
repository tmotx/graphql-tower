import _ from 'lodash';

export function UnauthorizedError(message = 'unknown error') {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = 'UnauthorizedError';
  this.message = message;
}

export function resolveWithAuth(resolve) {
  return async (payload, args, context, info) => {
    const user = _.get(context, 'user', {});

    if (!(_.isPlainObject(user) && user.id > 0)) {
      throw new UnauthorizedError('authorization header is required');
    }

    const reploy = await resolve(payload, args, context, info);
    return reploy;
  };
}
