export default function next(handler) {
  // promise
  let promise;
  const then = (...resolve) => {
    if (!promise) promise = Promise.resolve().then(handler);
    return promise.then(...resolve);
  };

  return Object.assign(Promise.resolve(handler), { then });
}
