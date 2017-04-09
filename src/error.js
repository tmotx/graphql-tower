import { GraphQLError } from 'graphql/error';

export class ForbiddenError extends GraphQLError {
  name = 'ForbiddenError';
}

export class NotFoundError extends GraphQLError {
  name = 'NotFoundError';
}

export class UnauthorizedError extends GraphQLError {
  name = 'UnauthorizedError';
}
