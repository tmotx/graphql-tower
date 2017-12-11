import floor from 'lodash/floor';
import Redis from 'graphql-tower-redis';
import { PubSub } from 'graphql-subscriptions';

export default class RedisPubSub extends PubSub {
  constructor(env = {}, options = {}) {
    super();
    this.pub = new Redis(env.PUBSUB_URL);
    this.sub = new Redis(env.PUBSUB_URL);
    this.sub.on('connect', () => this.sub.psubscribe('TOWER_PUBSUB::*'));
    this.sub.on('pmessage', async (pattern, patternChannel, message) => {
      const channel = patternChannel.replace(/^TOWER_PUBSUB::/, '');
      const contextValue = await this.onMessage(message, channel);
      const data = await this.format(message, channel, contextValue);
      super.publish(channel, { data, contextValue });
    });

    this.format = options.format || JSON.parse;
    this.stringify = options.stringify || JSON.stringify;
    this.onMessage = options.onMessage || (() => ({}));
    if (env.PUBSUB_INTERVAL) this.setInterval();
  }

  async publish(triggerName, payload) {
    return this.pub.publish(`TOWER_PUBSUB::${triggerName}`, await this.stringify(payload));
  }

  async quit() {
    if (this.interval) clearTimeout(this.interval);
    return Promise.all([this.pub.quit(), this.sub.quit()]);
  }

  async setInterval() {
    const message = JSON.stringify({ timestamp: floor(Date.now(), -4) });
    const contextValue = await this.onMessage(message, 'onInterval');
    const data = await this.format(message, 'onInterval', contextValue);
    super.publish('onInterval', { data, contextValue });
    this.interval = setTimeout(() => this.setInterval(), 10000);
  }
}
