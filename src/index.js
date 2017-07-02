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
import unique from './unique';
import Query, { QueryWithConnection } from './query';
import Mutation from './mutation';
import {
  GraphQLResponseStatus,
  GraphQLGID,
  GraphQLDate,
  GraphQLExpiration,
  GraphQLSentence,
  GraphQLMobile,
} from './type';

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
  unique,
  toGlobalId,
  fromGlobalId,
  GraphQLGlobalIdField,

  // query
  Query,
  QueryWithConnection,

  // mutation
  Mutation,

  // type
  GraphQLResponseStatus,
  GraphQLGID,
  GraphQLDate,
  GraphQLExpiration,
  GraphQLSentence,
  GraphQLMobile,
};
