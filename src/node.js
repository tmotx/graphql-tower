import { GraphQLNonNull, GraphQLID } from 'graphql';

class GlobalId {
  constructor(type, id) {
    this.type = type;
    this.id = id;
  }

  getType() {
    return this.type;
  }

  toString() {
    return this.id;
  }
}

export function toGlobalId(type, id) {
  return new Buffer(`${type}:${id}`, 'utf8').toString('base64');
}

export function fromGlobalId(globalId) {
  const unbased = new Buffer(globalId, 'base64').toString('utf8').split(':');
  return new GlobalId(unbased[0], unbased[1]);
}

export class GraphQLGlobalIdField {

  type = new GraphQLNonNull(GraphQLID);

  description = 'The ID of an object';

  typeName = 'type';

  constructor(typeName) {
    this.typeName = typeName;
  }

  resolve = (payload, args, context, info) => {
    const value = payload[info.fieldName || 'id'];
    const typeName = this.typeName || info.parentType.name;

    return toGlobalId(typeName, value);
  }
}
