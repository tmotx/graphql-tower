export default function functional(handler, ...args) {
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
