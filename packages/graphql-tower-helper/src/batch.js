export default function batch(handler) {
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
