import _ from 'lodash';
import { GraphQLList, GraphQLString, GraphQLInt } from 'graphql';

export function queryWithConnection(data) {
  const { type, ...configs } = _.defaultsDeep(data, {
    args: {
      first: { type: GraphQLInt },
      offset: { type: GraphQLInt },
      after: { type: GraphQLString },
    },
  });

  return {
    type: new GraphQLList(type),
    ...configs,
  };
}

export function queryWithPagination(configs) {
  return queryWithConnection({
    ...configs,
    resolve: async (payload, args, context, info) => {
      const { first, after } = args;

      const results = await configs.resolve(payload, args, context, info);

      const offset = _.get(args, 'offset', after ? _.findIndex(
        results, ({ id, cursor }) => (id === after || cursor === after),
      ) : 0);

      return _.take(_.drop(results, offset), first || 1000);
    },
  });
}
