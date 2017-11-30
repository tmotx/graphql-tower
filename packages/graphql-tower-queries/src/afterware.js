import _ from 'lodash';

export function pagination(payload, args, context, info, results) {
  const { first, after } = args;

  const index = after &&
    _.findIndex(results, ({ id, cursor }) => (id === after || cursor === after));

  const offset = _.sum([
    index > 0 ? index : 0,
    _.get(args, ['offset'], 0),
    _.get(results, ['offset'], 0),
  ]);

  return _.take(_.drop(results, offset), first || 1000);
}

export { pagination as default };
