import _ from 'lodash';
import { GraphQLNonNull, GraphQLID } from 'graphql';

class GlobalId {
  constructor(type, id) {
    Object.defineProperty(this, 'type', {
      enumerable: true,
      get: () => type,
    });

    Object.defineProperty(this, 'id', {
      enumerable: true,
      get: () => id,
    });
  }

  toString() {
    return this.id;
  }
}

export function toGlobalId(type, id) {
  return new Buffer(`${type}:${id}`, 'utf8').toString('base64');
}

export function fromGlobalId(globalId, verification) {
  const [type, id] = new Buffer(globalId, 'base64').toString('utf8').split(':');

  if (!id || id === '0') throw TypeError('invalid global id');

  if (verification && verification !== type) throw TypeError('invalid global id');

  return verification ? id : new GlobalId(type, id);
}

export class GraphQLGlobalIdField {

  type = new GraphQLNonNull(GraphQLID);

  description = 'The ID of an object';

  typeName = 'type';

  constructor(typeName) {
    this.typeName = typeName;
  }

  resolve = (payload, args, context, info) => {
    const value = _.isObject(payload) ? payload[info.fieldName] : payload;
    const typeName = this.typeName || info.parentType.name;

    return toGlobalId(typeName, value);
  }
}
