import _ from 'lodash';

export default Parent => class Cache extends Parent {
  static load(id, error, cache) {
    const nativeId = this.fromGlobalId(id);

    const promise = Promise.resolve({});
    const next = promise.then;

    if (cache) {
      return Object.assign(promise, {
        nativeId,
        then: (...args) => next.call(promise, () => {
          if (!nativeId) return null;
          return cache.load(this.toGlobalId(id), error);
        })
          .then(...args),
      });
    }

    return super.load(id, error);
  }

  constructor(attrs, options) {
    super(attrs, options);
    this.cache = _.get(options, ['cache'], null);
  }

  prime() {
    const { cache, id } = this;
    if (cache && id) cache.prime(id, this);
    return this;
  }

  clear() {
    const { cache, id } = this;
    if (cache && id) cache.clear(id);
    return this;
  }

  async find(...args) {
    const results = await super.find(...args);
    _.forEach(results, (result) => {
      _.set(result, ['cache'], this.cache);
      result.prime();
    });
    return results;
  }

  async insert(...args) {
    const result = await super.insert(...args);
    this.prime();
    return result;
  }

  async destroy(...args) {
    const result = await super.destroy(...args);
    this.clear();
    return result;
  }
};
