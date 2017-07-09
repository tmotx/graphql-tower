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

export function isGlobalId(globalId) {
  return /^i[\w\d]+$/.test(globalId);
}

export function toGlobalId(type, id) {
  return `i${bs62.encode(Buffer.from(`${type}:${id}`))}`;
}

export function fromGlobalId(globalId, verification) {
  try {
    if (!isGlobalId(globalId)) throw new TypeError();

    const [type, id] = _.split(`${bs62.decode(globalId.substr(1))}`, ':');

    if (!id) throw TypeError();

    if (verification && verification !== type) throw TypeError();

    return verification ? id : new GlobalId(type, id);
  } catch (error) {
    throw TypeError('invalid global id');
  }
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
