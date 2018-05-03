import forEach from 'lodash/forEach';
import redis from 'redis';
import commands from 'redis-commands';

export default class Redis {
  constructor(env = '') {
    if (!env.REDIS_URL) return;
    this.io = redis.createClient(env.REDIS_URL);
  }

  multi(items) {
    if (!this.io) {
      throw new Error('REDIS_URL is required');
    }

    if (!items) return this.io.multi();
    return new Promise((resolve, rejects) => {
      this.io.multi(items).exec((err, replies) => {
        if (err) {
          rejects(err);
          return;
        }
        resolve(replies);
      });
    });
  }
}

forEach(commands.list, (key) => {
  if (['multi'].indexOf(key) > -1) return;
  Redis.prototype[key] = function Command(...args) {
    return new Promise((resolve, rejects) => {
      args.push((err, reply) => {
        if (err) {
          rejects(err);
          return;
        }
        resolve(reply);
      });

      if (!this.io) {
        rejects(new Error('REDIS_URL is required'));
        return;
      }

      this.io[key](...args);
    });
  };
});


forEach(['on', 'once', 'addListener', 'removeListener'], (key) => {
  Redis.prototype[key] = function Command(...args) {
    if (!this.io) return;
    this.io[key](...args);
  };
});
