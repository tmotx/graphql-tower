export default class TimeToLiveStore {
  static collections = [];

  static cleaner;

  map = null;

  ttl = null;

  constructor(ttl = 24) {
    this.map = new Map();
    this.ttl = ttl * 60 * 60 * 1000;

    TimeToLiveStore.collections.push(this);

    if (!TimeToLiveStore.cleaner) {
      TimeToLiveStore.cleaner = function cleaner() {
        TimeToLiveStore.collections.map(cache => cache.clear());
        setTimeout(TimeToLiveStore.cleaner, 60 * 60 * 1000);
      };

      TimeToLiveStore.cleaner();
    }
  }

  get(key) {
    const cache = this.map.get(key);

    if (cache && cache.ttl > Date.now()) {
      return cache.value;
    }

    this.delete(key);
    return undefined;
  }

  set(key, value) {
    this.map.set(key, { value, ttl: Date.now() + this.ttl });
    return this;
  }

  delete(key) {
    this.map.delete(key);
    return this;
  }

  clear(force = false) {
    if (force) return this.map.clear();

    return this.map.forEach((cache, key) => {
      if (cache.ttl < Date.now()) this.delete(key);
    });
  }
}
