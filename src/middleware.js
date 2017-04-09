import _ from 'lodash';
import { UnauthorizedError } from './error';

export function authentication(payload, args, context) {
  const user = _.get(context, 'user', {});

  if (!(_.isPlainObject(user) && user.id > 0)) {
    throw new UnauthorizedError('authorization header is required');
  }
}

export { authentication as default };
