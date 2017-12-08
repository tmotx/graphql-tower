import RedisPubSub from '../';

jest.useFakeTimers();

describe('redis pubsub', () => {
  it('publish / subscribe', async () => {
    const redis = new RedisPubSub();

    let resolve;
    const promise = new Promise((next) => { resolve = next; });

    redis.sub.on('psubscribe', () => redis.publish('onAddMessage', { x: 1 }));
    redis.subscribe('onAddMessage', message => resolve(message));
    expect(await promise).toEqual({ x: 1 });
    await redis.quit();
  });

  it('format / stringify', async () => {
    const redis = new RedisPubSub({}, {
      format: value => parseInt(value, 10) + 1,
      stringify: value => parseInt(value, 10) + 1,
    });

    let resolve;
    const promise = new Promise((next) => { resolve = next; });

    redis.sub.on('psubscribe', () => redis.publish('onAddMessage', 1));
    redis.subscribe('onAddMessage', message => resolve(message));
    expect(await promise).toEqual(3);
    await redis.quit();
  });

  it('onInterval', async () => {
    const listener = jest.fn();
    const redis = new RedisPubSub({ PUBSUB_INTERVAL: true });
    redis.subscribe('onInterval', listener);

    let resolve;
    const promise = new Promise((next) => { resolve = next; });
    redis.sub.on('psubscribe', resolve);
    await promise;

    expect(setTimeout).toHaveBeenCalledTimes(1);
    jest.runOnlyPendingTimers();
    expect(listener).toHaveBeenLastCalledWith({ timestamp: expect.any(Number) });
    expect(listener).toHaveBeenCalledTimes(1);

    await redis.quit();
  });
});
