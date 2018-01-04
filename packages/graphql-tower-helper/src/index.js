export function thunk(handler) {
  return (...args) => (typeof handler === 'function' ? handler(...args) : handler);
}

export function coalesce(...args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== undefined && args[index] !== null) {
      return args[index];
    }
  }

  return '';
}

export function combine(handler, args) {
  // promise
  let promise;
  Promise.resolve(args);
  const then = (...resolve) => {
    if (!promise) promise = Promise.resolve(args).then(handler);
    return promise.then(...resolve);
  };

  // merge
  return Object.assign(add => combine(handler, Object.assign({}, args, add)), args, {
    then, promise: Object.assign(Promise.resolve(args), args, { then }),
  });
}

export function functional(handler, ...args) {
  // promise
  let promise;
  const then = (...resolve) => {
    if (!promise) promise = Promise.resolve(args).then(() => handler(...args));
    return promise.then(...resolve);
  };

  // merge
  const reply = Object.assign((...add) => {
    const fill = args.map(value => (value === undefined ? add.shift() : value));
    const nextTo = functional(handler, ...fill.concat(add));

    // support defineProperty
    Reflect.ownKeys(reply).forEach((key) => {
      if (nextTo[key] === undefined) {
        Object.defineProperty(nextTo, key, Object.getOwnPropertyDescriptor(reply, key));
      }
    });
    return nextTo;
  }, { then, promise: Object.assign(Promise.resolve(args), args, { then }) });

  return reply;
}

export function next(handler) {
  // promise
  let promise;
  const then = (...resolve) => {
    if (!promise) promise = Promise.resolve().then(handler);
    return promise.then(...resolve);
  };

  return Object.assign(Promise.resolve(handler), { then });
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

export function displayName(Component) {
  return Component.displayName || Component.name || 'Unknown';
}

export function assertResult(value, ThrowError) {
  if (!value && ThrowError && (ThrowError.prototype instanceof Error || ThrowError.name === 'Error')) {
    throw new ThrowError();
  }

  return value;
}

export function batch(handler) {
  let queue = [];

  const dispatchPromise = Promise.resolve();
  const dispatch = () => {
    const temp = queue;
    queue = [];

    const keys = temp.map(({ key }) => key);
    return handler(keys)
      .then((results = []) => temp.forEach(({ resolve, reject }, idx) => {
        if (results[idx] instanceof Error) {
          reject(results[idx]);
          return;
        }

        resolve(results[idx]);
      }))
      .catch(err => temp.forEach(({ reject }) => reject(err)));
  };


  return key => new Promise((resolve, reject) => {
    queue.push({ key, resolve, reject });
    if (queue.length === 1) process.nextTick(() => dispatchPromise.then(dispatch));
  });
}
