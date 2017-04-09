import { GraphQLError } from 'graphql/error';

export class ForbiddenError extends GraphQLError {
  name = 'ForbiddenError';

  constructor(message = 'ForbiddenError') {
    super(message);
  }
}

export class NotFoundError extends GraphQLError {
  name = 'NotFoundError';

  constructor(message = 'NotFoundError') {
    super(message);
  }
}

export class UnauthorizedError extends GraphQLError {
  name = 'UnauthorizedError';

  constructor(message = 'UnauthorizedError') {
    super(message);
  }
}
