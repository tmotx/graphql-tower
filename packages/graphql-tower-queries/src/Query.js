import _ from 'lodash';
import PayloadField from './PayloadField';

export default class Query {
  static resolveArgs(...args) {
    return _.defaultsDeep(_.mapValues(this._.parentArgs, (value, key) => (
      value instanceof PayloadField ? value.resolveValue(...args, key) : value
    )), args[1]);
  }

  static async preResolve(payload, client, context, info) {
    const { resolveArgs, resolve } = this.constructor;
    const args = resolveArgs.call(this, payload, client, context, info);
    return resolve.call(this, payload, args, context, info);
  }

  static async resolve(...args) {
    await this._.middleware.reduce(async (prev, middleware) => {
      await prev;
      await middleware(...args);
    }, Promise.resolve());

    return this._.afterware.reduce(async (prev, afterware) => (
      afterware(...args, await prev)
    ), this._.resolve(...args));
  }

  constructor(parentArgs) {
    this._.parentArgs = parentArgs;

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => this.constructor.preResolve.bind(this),
    });
  }

  args = {};

  _ = {
    middleware: [],
    afterware: [],
    resolve: _.identity,
    parentArgs: {},
  }

  get node() {
    return _.defaultTo(this._.node, this.type);
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
}
