import floor from 'lodash/floor';
import Redis from 'graphql-tower-redis';
import { PubSub } from 'graphql-subscriptions';

export default class RedisPubSub extends PubSub {
  constructor(env = {}, options = {}) {
    super();
    this.pub = new Redis(env.PUBSUB_URL);
    this.sub = new Redis(env.PUBSUB_URL);
    this.sub.on('connect', () => this.sub.psubscribe('TOWER_PUBSUB::*'));
    this.sub.on('pmessage', async (pattern, channel, message) => {
      super.publish(channel.replace(/^TOWER_PUBSUB::/, ''), await this.format(message));
    });

    this.format = options.format || JSON.parse;
    this.stringify = options.stringify || JSON.stringify;
    if (env.PUBSUB_INTERVAL) this.setInterval();
  }

  async publish(triggerName, payload) {
    return this.pub.publish(`TOWER_PUBSUB::${triggerName}`, await this.stringify(payload));
  }

  quit() {
    if (this.interval) clearTimeout(this.interval);
    return Promise.all([this.pub.quit(), this.sub.quit()]);
  }

  setInterval() {
    super.publish('onInterval', { timestamp: floor(Date.now(), -4) });
    this.interval = setTimeout(() => this.setInterval(), 10000);
  }
}
