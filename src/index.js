import { authentication } from './middleware';
import { pagination } from './afterware';
import { ForbiddenError, NotFoundError, UnauthorizedError } from './error';
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
