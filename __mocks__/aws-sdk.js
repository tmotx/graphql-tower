export const promise = jest.fn(() => Promise.resolve());
export const createReadStream = jest.fn();

export default {
  S3: () => ({
    headObject: params => ({
      promise: () => promise({ ...params, method: 'headObject' }),
      createReadStream: () => createReadStream({ ...params, method: 'headObject' }),
    }),
    getObject: params => ({
      promise: () => promise({ ...params, method: 'getObject' }),
      createReadStream: () => createReadStream({ ...params, method: 'getObject' }),
    }),
    copyObject: params => ({
      promise: () => promise({ ...params, method: 'copyObject' }),
      createReadStream: () => createReadStream({ ...params, method: 'copyObject' }),
    }),
    upload: params => ({
      promise: () => promise({ ...params, method: 'upload' }),
      createReadStream: () => createReadStream({ ...params, method: 'upload' }),
    }),
  }),
  Lambda: () => ({
    invoke: params => ({
      promise: () => promise({ ...params, method: 'invoke' }),
    }),
  }),
};
