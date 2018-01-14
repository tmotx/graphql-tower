export default function combine(handler, args) {
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
