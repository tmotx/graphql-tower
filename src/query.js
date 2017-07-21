import _ from 'lodash';
import { GraphQLList, GraphQLString, GraphQLInt } from 'graphql';

export class PayloadField {
  constructor(field) {
    if (_.isFunction(field)) {
      this.getValue = field;
      return;
    }
    this.field = field;
  }

  getValue(payload, args, context, info, key) {
    return _.get(payload, this.field || key);
  }
}

export default class Query {

  constructor(parentArgs) {
    this._.parentArgs = parentArgs;

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: resolve => (this._.resolve = resolve),
      get: () => this.preResolve.bind(this),
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

  async preResolve(payload, clientArgs, context, info) {
    const args = _.defaultsDeep(_.mapValues(this._.parentArgs, (value, key) => (
      value instanceof PayloadField ?
        value.getValue(payload, clientArgs, context, info, key) : value
    )), clientArgs);

    await this._.middleware.reduce(async (prev, middleware) => {
      await prev;
      await middleware(payload, args, context, info);
    }, Promise.resolve());

    const results = await this._.afterware.reduce(async (prev, afterware) => (
      afterware(payload, args, context, info, await prev)
    ), this._.resolve(payload, args, context, info));

    return results;
  }
}

export class QueryWithNode extends Query {

  constructor(fieldName) {
    super({ id: new PayloadField((payload, args, context, info) => (
      _.get(payload, fieldName || `${info.fieldName}Id`)
    )) });
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
