import { GraphQLError } from 'graphql/error';

export class ForbiddenError extends GraphQLError {
  symbol = 'ForbiddenError';

  constructor(message = 'ForbiddenError') {
    super(message);
  }
}

export class NotFoundError extends GraphQLError {
  symbol = 'NotFoundError';

  constructor(message = 'NotFoundError') {
    super(message);
  }
}

export class UnauthorizedError extends GraphQLError {
  symbol = 'UnauthorizedError';

  constructor(message = 'UnauthorizedError') {
    super(message);
  }
}

export class PaymentRequiredError extends GraphQLError {
  symbol = 'PaymentRequiredError';

  constructor(message = 'PaymentRequiredError') {
    super(message);
  }
}

export class NotAcceptableError extends GraphQLError {
  symbol = 'NotAcceptableError';

  constructor(message = 'NotAcceptableError') {
    super(message);
  }
}

export class GoneDataError extends GraphQLError {
  symbol = 'GoneDataError';

  constructor(message = 'GoneDataError') {
    super(message);
  }
}

export class ConflictError extends GraphQLError {
  symbol = 'ConflictError';

  constructor(message = 'ConflictError') {
    super(message);
  }
}

export class LockedError extends GraphQLError {
  symbol = 'LockedError';

  constructor(message = 'LockedError') {
    super(message);
  }
}

export class UnavailableForLegalReasonsError extends GraphQLError {
  symbol = 'UnavailableForLegalReasonsError';

  constructor(message = 'UnavailableForLegalReasonsError') {
    super(message);
  }
}
