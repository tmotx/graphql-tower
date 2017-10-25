import _ from 'lodash';
import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType } from 'graphql';
import resolveMaybeThunk from './resolveMaybeThunk';
import Query from './Query';

export default class Mutation extends Query {
  constructor(...args) {
    super(...args);

    this._.name = '';
    this.outputFields = {};
    this.inputFields = {};
  }

  set name(value) {
    _.set(this, 'type.name', `${value}Payload`);
    _.set(this, 'args.input.type.ofType.name', `${value}Input`);
    this._.name = value;
  }

  set outputFields(value) {
    this.type = new GraphQLObjectType({
      name: `${this._.name}Payload`,
      fields: resolveMaybeThunk(value),
    });
  }

  set inputFields(value) {
    const inputType = new GraphQLInputObjectType({
      name: `${this._.name}Input`,
      fields: resolveMaybeThunk(value),
    });

    _.set(this, 'args.input.type', new GraphQLNonNull(inputType));
  }
}
