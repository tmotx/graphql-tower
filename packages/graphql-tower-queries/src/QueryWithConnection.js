import { GraphQLInt, GraphQLString, GraphQLList, GraphQLObjectType } from 'graphql';
import assign from 'lodash/assign';
import pick from 'lodash/pick';
import Query from './Query';

const connectionTypes = new Map();

export default class QueryWithConnection extends Query {
  static async resolve(...args) {
    const results = await this._.resolve(...args);
    return assign(await this._.afterware.reduce(async (prev, afterware) => (
      afterware(...args, await prev)
    ), Promise.resolve(results)), pick(results, ['offset', 'totalCount']));
  }

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
      },
      get: () => {
        if (!connectionTypes.has(this.name) && this._.node) {
          connectionTypes.set(this.name, new GraphQLObjectType({
            name: `${this.name}Connection`,
            fields: {
              totalCount: { type: GraphQLInt },
              nodes: {
                type: new GraphQLList(this._.node),
                resolve: payload => payload,
              },
            },
          }));
        }

        return connectionTypes.get(this.name);
      },
    });
  }
}
