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
  const reply = Object.assign((...add) => {
    const fill = args.map(value => (value === undefined ? add.shift() : value));
    const nextTo = next(handler, ...fill.concat(add));
    Reflect.ownKeys(reply).forEach((key) => {
      if (nextTo[key] === undefined) {
        Object.defineProperty(nextTo, key, Object.getOwnPropertyDescriptor(reply, key));
      }
    });
    return nextTo;
  }, { then, promise: Object.assign(Promise.resolve(args), args, { then }) });

  return reply;
}

export function retry(handler, times = 3) {
  return new Promise((resolve, reject) => {
    Promise.resolve(times).then(handler).then(resolve, (error) => {
      if (times < 1) {
        reject(error);
        return;
      }

      retry(handler, times - 1).then(resolve, reject);
    });
  });
}

export function assertResult(value, ThrowError) {
  if (!value && ThrowError && (ThrowError.prototype instanceof Error || ThrowError.name === 'Error')) {
    throw new ThrowError();
  }

  return value;
}
