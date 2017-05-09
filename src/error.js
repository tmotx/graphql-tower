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

export class PaymentRequiredError extends GraphQLError {
  name = 'PaymentRequiredError';

  constructor(message = 'PaymentRequiredError') {
    super(message);
  }
}

export class GoneDataError extends GraphQLError {
  name = 'GoneDataError';

  constructor(message = 'GoneDataError') {
    super(message);
  }
}

export class ConflictError extends GraphQLError {
  name = 'ConflictError';

  constructor(message = 'ConflictError') {
    super(message);
  }
}

export class LockedError extends GraphQLError {
  name = 'LockedError';

  constructor(message = 'LockedError') {
    super(message);
  }
}

export class UnavailableForLegalReasonsError extends GraphQLError {
  name = 'UnavailableForLegalReasonsError';

  constructor(message = 'UnavailableForLegalReasonsError') {
    super(message);
  }
}

