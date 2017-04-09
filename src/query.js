import _ from 'lodash';
import { GraphQLList, GraphQLString, GraphQLInt } from 'graphql';

export default class Query {

  args = {};

  _ = {
    middleware: [],
    afterware: [],
    resolve: () => {},
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

  set resolve(handler) {
    this._.resolve = handler;
  }

  get resolve() {
    return async (payload, args, context, info) => {
      await this._.middleware.reduce(async (prev, middleware) => {
        await prev;
        await middleware(payload, args, context, info);
      }, Promise.resolve());

      const results = await this._.afterware.reduce(async (prev, afterware) => {
        const reply = await afterware(payload, args, context, info, await prev);
        return reply;
      }, this._.resolve(payload, args, context, info));

      return results;
    };
  }
}

export class QueryWithConnection extends Query {

  constructor(...args) {
    super(...args);

    _.defaultsDeep(this.args, {
      first: { type: GraphQLInt },
      offset: { type: GraphQLInt },
      after: { type: GraphQLString },
    });
  }

  get type() {
    return this._.type;
  }

  set type(value) {
    this._.type = new GraphQLList(value);
  }
}
