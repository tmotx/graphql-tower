import Redis from '../';

const redis = new Redis({ REDIS_URL: 'redis://127.0.0.1:6379/' });
const pub = new Redis({ REDIS_URL: 'redis://127.0.0.1:6379/' });

describe('redis', () => {
  it('get / set', async () => {
    await redis.set('key', 'abc');
    expect(await redis.get('key')).toBe('abc');

    await redis.del('incr_key');
    await redis.incr('incr_key');
    expect(await redis.get('incr_key')).toBe('1');
  });

  it('hget / hset', async () => {
    await redis.hset('hash', 'key', 'abc');
    expect(await redis.hget('hash', 'key')).toBe('abc');
  });

  it('multi', async () => {
    let resolve;
    const promise = new Promise((next) => { resolve = next; });
    await redis.multi().set('mkey', 'abc').exec((err, replies) => resolve(replies));
    expect(await promise).toEqual(['OK']);

    expect(await redis.multi([['set', 'mkey', 'abc']])).toEqual(['OK']);

    await expect(redis.multi([['set', 'mkey']])).rejects.toEqual(
      new Error('EXECABORT Transaction discarded because of previous errors.'),
    );
  });

  it('publish / subscribe', async () => {
    redis.on('subscribe', () => {
      pub.publish('a nice channel', 'I am sending a message.');
    });

    let resolve;
    const promise = new Promise((next) => { resolve = next; });

    redis.on('message', (channel, message) => resolve(message));

    redis.subscribe('a nice channel');

    const message = await promise;
    expect(message).toBe('I am sending a message.');

    await redis.unsubscribe();

    await redis.quit();
    await pub.quit();
  });

  it('on / off', async () => {
    const listener = jest.fn();
    redis.on('ready', listener);
    redis.once('ready', listener);
    redis.addListener('ready', listener);
    redis.removeListener('ready', listener);
  });

  it('throw', async () => {
    await expect(redis.hget('hash')).rejects.toEqual(
      new Error('HGET can\'t be processed. The connection is already closed.'),
    );
  });
});
