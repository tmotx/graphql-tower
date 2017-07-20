import _ from 'lodash';
import { GraphQLList, GraphQLString, GraphQLInt } from 'graphql';

export default class Query {

  constructor() {
    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: handler => (this.handler = handler),
      get: () => async (payload, args, context, info) => {
        await this._.middleware.reduce(async (prev, middleware) => {
          await prev;
          await middleware(payload, args, context, info);
        }, Promise.resolve());

        const results = await this._.afterware.reduce(async (prev, afterware) => (
          afterware(payload, args, context, info, await prev)
        ), this._.resolve(payload, args, context, info));

        return results;
      },
    });
  }

  args = {};

  _ = {
    middleware: [],
    afterware: [],
    resolve: _.identity,
  }

  get node() {
    return this._.node || this.type;
  }

  set middleware(handler) {
    if (_.isFunction(handler) || _.isArray(handler)) {
      this._.middleware = _.concat(this._.middleware, handler);
      return;
    }

    throw new Error('middleware a function array is required');
  }

  set afterware(handler) {
    if (_.isFunction(handler) || _.isArray(handler)) {
      this._.afterware = _.concat(this._.afterware, handler);
      return;
    }

    throw new Error('afterware a function array is required');
  }

  set handler(value) {
    this._.resolve = value;
  }
}

export class QueryWithNode extends Query {

  constructor(fieldName) {
    super();
    _.set(this._, 'resolveNode', _.identity);
    _.set(this._, 'resolve', (payload, args, context, info) => {
      const namd = fieldName || `${info.fieldName}Id`;
      return this._.resolveNode(payload[namd], args, context, info);
    });
  }

  set handler(value) {
    this._.resolveNode = value;
  }
}

export class QueryWithConnection extends Query {

  constructor() {
    super();

    _.defaultsDeep(this.args, {
      first: { type: GraphQLInt },
      offset: { type: GraphQLInt },
      after: { type: GraphQLString },
    });

    Object.defineProperty(this, 'type', {
      enumerable: true,
      set: (type) => {
        this._.node = type;
        this._.type = new GraphQLList(type);
      },
      get: () => this._.type,
    });
  }
}
