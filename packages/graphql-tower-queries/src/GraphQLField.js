import identity from 'lodash/identity';
import defaultTo from 'lodash/defaultTo';
import concat from 'lodash/concat';
import set from 'lodash/set';
import isFunction from 'lodash/isFunction';
import isArray from 'lodash/isArray';
import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType } from 'graphql';

export default class GraphQLField {
  static async middleware(...args) {
    return this._.middleware.reduce(async (prev, middleware) => {
      await prev;
      await middleware(...args);
      return true;
    }, Promise.resolve(true));
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
    subscribe: identity,
    name: undefined,
  }

  set name(value) {
    this._.name = value;
  }

  get name() {
    return this._.name || this.constructor.name;
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

  set outputFields(fields) {
    this.type = new GraphQLObjectType({ name: `${this.name}Payload`, fields });
  }

  set inputFields(fields) {
    const inputType = new GraphQLInputObjectType({ name: `${this.name}Input`, fields });
    set(this, 'args.input.type', new GraphQLNonNull(inputType));
  }
}
