import { authentication } from './middleware';
import { pagination } from './afterware';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  PaymentRequiredError,
  GoneDataError,
  LockedError,
  ConflictError,
  UnavailableForLegalReasonsError,
} from './error';
import { toGlobalId, fromGlobalId, GraphQLGlobalIdField } from './node';
import Query, { QueryWithConnection } from './query';
import Mutation from './mutation';

module.exports = {
  // middleware
  authentication,

  // afterware
  pagination,

  // error
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  PaymentRequiredError,
  GoneDataError,
  LockedError,
  ConflictError,
  UnavailableForLegalReasonsError,

  // node
  toGlobalId,
  fromGlobalId,
  GraphQLGlobalIdField,

  // query
  Query,
  QueryWithConnection,

  // mutation
  Mutation,
};
