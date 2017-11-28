import identity from 'lodash/identity';
import defaultTo from 'lodash/defaultTo';
import concat from 'lodash/concat';
import isFunction from 'lodash/isFunction';
import isArray from 'lodash/isArray';

export default class GraphQLField {
  static async middleware(...args) {
    return this._.middleware.reduce(async (prev, middleware) => {
      await prev;
      await middleware(...args);
    }, Promise.resolve());
  }

  static async resolve(...args) {
    return this._.afterware.reduce(async (prev, afterware) => (
      afterware(...args, await prev)
    ), this._.resolve(...args));
  }

  args = {};

  _ = {
    middleware: [],
    afterware: [],
    resolve: identity,
  }

  // for QueryWithConnection
  get node() {
    return defaultTo(this._.node, this.type);
  }

  set middleware(handler) {
    if (isFunction(handler) || isArray(handler)) {
      this._.middleware = concat(this._.middleware, handler);
      return;
    }

    throw new Error('middleware a function array is required');
  }

  set afterware(handler) {
    if (isFunction(handler) || isArray(handler)) {
      this._.afterware = concat(this._.afterware, handler);
      return;
    }

    throw new Error('afterware a function array is required');
  }
}
