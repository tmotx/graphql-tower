import { GraphQLInt, GraphQLString, GraphQLList, GraphQLObjectType } from 'graphql';
import assign from 'lodash/assign';
import Query from './Query';

export default class QueryWithConnection extends Query {
  constructor(...args) {
    super(...args);

    this._.args = {
      first: { type: GraphQLInt },
      offset: { type: GraphQLInt },
      after: { type: GraphQLString },
    };

    Object.defineProperty(this, 'args', {
      enumerable: true,
      set: (value) => { assign(this._.args, value); },
      get: () => this._.args,
    });

    Object.defineProperty(this, 'type', {
      enumerable: true,
      set: (type) => {
        this._.node = type;
        this._.type = new GraphQLObjectType({
          name: `${this.name}Connection`,
          fields: {
            totalCount: { type: GraphQLInt },
            nodes: {
              type: new GraphQLList(type),
              resolve: payload => payload,
            },
          },
        });
      },
      get: () => this._.type,
    });
  }
}
