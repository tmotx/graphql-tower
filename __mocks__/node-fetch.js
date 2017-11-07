export const fetch = jest.fn(() => Promise.resolve());

export default (...args) => (Promise.resolve({ json: () => fetch(...args) }));
