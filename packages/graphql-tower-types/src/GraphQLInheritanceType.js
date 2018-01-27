/* eslint no-underscore-dangle: ["error", { "allow": ["_fields"] }] */

import { GraphQLObjectType } from 'graphql';

export default class extends GraphQLObjectType {
  getFields() {
    if (!this._fields) {
      const interfaces = this.getInterfaces().map(item => item.getFields());
      this._fields = Object.assign({}, ...interfaces, super.getFields());
    }

    return this._fields;
  }
}
