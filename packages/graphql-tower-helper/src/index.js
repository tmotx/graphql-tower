export function thunk(handler) {
  return (...args) => (typeof handler === 'function' ? handler(...args) : handler);
}

export function combine(handler, args) {
  const then = (...promise) => Promise.resolve(args).then(handler).then(...promise);
  return Object.assign(add => combine(handler, Object.assign({}, args, add)), args, {
    then, promise: Object.assign(Promise.resolve(args), args, { then }),
  });
}

export function next(handler, ...args) {
  const then = (...promise) => Promise.resolve(args).then(() => handler(...args)).then(...promise);
  return Object.assign((...add) => {
    const fill = args.map(value => (value === undefined ? add.shift() : value));
    return next(handler, ...fill.concat(add));
  }, { then, promise: Object.assign(Promise.resolve(args), args, { then }) });
}
