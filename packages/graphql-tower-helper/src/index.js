export function thunk(handler) {
  return (...props) => (typeof handler === 'function' ? handler(...props) : handler);
}

export function next(handler, properties) {
  const reply = Object.assign(Promise.resolve(), handler, properties);

  reply.then = (...args) => Promise.resolve().then(() => {
    if (handler instanceof Promise) {
      Object.assign(handler, properties);
      return handler;
    }

    delete reply.then;
    return handler(Object.assign({}, reply));
  }).then(...args);

  return reply;
}
