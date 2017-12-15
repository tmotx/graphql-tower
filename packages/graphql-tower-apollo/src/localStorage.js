import global from 'global/window';

export default global.localStorage || {
  setItem: () => undefined,
  getItem: () => undefined,
};
