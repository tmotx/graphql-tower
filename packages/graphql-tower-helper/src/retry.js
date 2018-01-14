export default function retry(handler, times = 3) {
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
