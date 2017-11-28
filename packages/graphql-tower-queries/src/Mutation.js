import _ from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType } from 'graphql';
import GraphQLField from './GraphQLField';

export default class Mutation extends GraphQLField {
  constructor() {
    super();

    Object.defineProperty(this, 'resolve', {
      enumerable: true,
      set: (resolve) => { this._.resolve = resolve; },
      get: () => {
        const { middleware, resolve } = this.constructor;
        return async (...args) => {
          await middleware.apply(this, args);
          return resolve.apply(this, args);
        };
      },
    });

    this.name = this.constructor.name;
    this.outputFields = {};
    this.inputFields = {};
  }

  set name(value) {
    _.set(this, 'type.name', `${value}Payload`);
    _.set(this, 'args.input.type.ofType.name', `${value}Input`);
    this._.name = value;
  }

  set outputFields(fields) {
    this.type = new GraphQLObjectType({ name: `${this._.name}Payload`, fields });
  }

  set inputFields(fields) {
    const inputType = new GraphQLInputObjectType({ name: `${this._.name}Input`, fields });
    _.set(this, 'args.input.type', new GraphQLNonNull(inputType));
  }
}
