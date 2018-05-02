import forEach from 'lodash/forEach';
import redis from 'redis';
import commands from 'redis-commands';

export default class Redis {
  constructor(env = '') {
    const url = env.REDIS_URL || env;
    if (!url) return;
    this.client = redis.createClient();
  }

  multi(items) {
    if (!items) return this.client.multi();
    return new Promise((resolve, rejects) => {
      this.client.multi(items).exec((err, replies) => {
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
      this.client[key](...args);
    });
  };
});


forEach(['on', 'once', 'addListener', 'removeListener'], (key) => {
  Redis.prototype[key] = function Command(...args) {
    this.client[key](...args);
  };
});
