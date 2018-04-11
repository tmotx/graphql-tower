import isObject from 'lodash/isObject';
import toString from 'lodash/toString';
import { isGlobalId, toGlobalId } from 'graphql-tower-global-id';
import GraphQLParserType from './GraphQLParserType';

const GraphQLGID = new GraphQLParserType({
  name: 'GlobalID',
  description: 'The global id of an object',
  parseValue(value) {
    const id = toString(value);

    if (!isGlobalId(id)) {
      throw new TypeError('invalid global id');
    }

    return id;
  },
  fake: 'iNajVKI0O6ZDtu6xiZnMvb',
});

export class GraphQLGlobalIdField {
  type = GraphQLGID;

  description = 'The global id of an object';

  typeName = 'type';

  constructor(typeName) {
    this.typeName = typeName;
  }

  resolve = (payload, args, context, info) => {
    const value = isObject(payload) ? payload[info.fieldName] : payload;
    const typeName = this.typeName || info.parentType.name;

    return isGlobalId(value) ? value : toGlobalId(typeName, value);
  }
}

export default GraphQLGID;
