import _ from 'lodash';
import PayloadField from './PayloadField';
import GraphQLField from './GraphQLField';

export default class Query extends GraphQLField {
  static resolveArgs(...args) {
    return _.defaultsDeep(_.mapValues(this._.parentArgs, (value, key) => (
      value instanceof PayloadField ? value.resolveValue(...args, key) : value
    )), args[1]);
  }

  static async preResolve(payload, client, context, info) {
    const { resolveArgs, middleware, resolve } = this.constructor;
    const args = resolveArgs.call(this, payload, client, context, info);
    await middleware.call(this, payload, args, context, info);
    return resolve.call(this, payload, args, context, info);
  }

  constructor(parentArgs) {
    super();

    this._.parentArgs = parentArgs;

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => this.constructor.preResolve.bind(this),
    });
  }
}
