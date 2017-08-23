import _ from 'lodash';
import { UnauthorizedError } from './error';

export function authentication(payload, args, context) {
  if (!_.has(context, 'user.id')) {
    throw new UnauthorizedError('authorization header is required');
  }
}

export { authentication as default };
