export default function thunk(handler) {
  return (...args) => (typeof handler === 'function' ? handler(...args) : handler);
}
