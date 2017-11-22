const request = (...args) => (Promise.resolve({ json: () => request.fetch(...args) }));
request.fetch = jest.fn(() => Promise.resolve());

module.exports = request;
