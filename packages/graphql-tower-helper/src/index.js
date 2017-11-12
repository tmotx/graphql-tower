export function thunk(handler) {
  return (...args) => (typeof handler === 'function' ? handler(...args) : handler);
}

export function combine(handler, args) {
  return Object.assign(add => combine(handler, Object.assign({}, args, add)), args, {
    then: (...promise) => Promise.resolve(handler(args)).then(...promise),
  });
}

export function next(handler, ...args) {
  return Object.assign((...add) => {
    const fill = args.map(value => (value === undefined ? add.shift() : value));
    return next(handler, ...fill.concat(add));
  }, { then: (...promise) => Promise.resolve(handler(...args)).then(...promise) });
}
