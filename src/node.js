import _ from 'lodash';
import base from 'base-x';
import { GraphQLGID } from './type';

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

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
  return bs62.encode(Buffer.from(`${type}:${id}`));
}

export function fromGlobalId(globalId, verification) {
  const [type, id] = _.split(`${bs62.decode(globalId)}`, ':');

  if (!id || id === '0') throw TypeError('invalid global id');

  if (verification && verification !== type) throw TypeError('invalid global id');

  return verification ? id : new GlobalId(type, id);
}

export class GraphQLGlobalIdField {

  type = GraphQLGID;

  description = 'The global id of an object';

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
