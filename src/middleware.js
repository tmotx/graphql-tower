import _ from 'lodash';
import { UnauthorizedError } from './error';

export function authentication(payload, args, context) {
  if (!(_.get(context, 'user.id') > 0)) {
    throw new UnauthorizedError('authorization header is required');
  }
}

export { authentication as default };
