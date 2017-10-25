import _ from 'lodash';

export function pagination(payload, args, context, info, results) {
  const { first, after } = args;

  let offset = _.get(args, 'offset', 0);
  if (!offset && after) {
    offset = _.findIndex(results, ({ id, cursor }) => (id === after || cursor === after));
  }
  if (offset < 0) offset = 0;

  return _.take(_.drop(results, offset), first || 1000);
}

export { pagination as default };
