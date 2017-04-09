import _ from 'lodash';

export function pagination(payload, args, context, info, results) {
  const { first, after } = args;

  const offset = _.get(args, 'offset', after ? _.findIndex(
    results, ({ id, cursor }) => (id === after || cursor === after),
  ) : 0);

  return _.take(_.drop(results, offset), first || 1000);
}

export { pagination as default };
