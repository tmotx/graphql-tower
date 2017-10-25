import _ from 'lodash';
import faker from 'faker';
import DataLoader from 'dataloader';
import TimeToLiveStore from '../TimeToLiveStore';

jest.useFakeTimers();

describe('TimeToLiveStore', () => {
  it('set & get', () => {
    const key = faker.random.number();
    const value = faker.lorem.sentence();
    const cache = new TimeToLiveStore();

    cache.set(key, value);
    expect(cache.get(key)).toBe(value);
  });

  it('delete & not found', () => {
    const key = faker.random.number();
    const value = faker.lorem.sentence();
    const cache = new TimeToLiveStore();

    cache.set(key, value);
    cache.delete(key);
    expect(cache.get(key)).toBeUndefined();
  });

  it('expired & clear', () => {
    const cache = new TimeToLiveStore(99);

    cache.set(1, 'AAA');
    cache.set(2, 'BBB');
    cache.set(3, 'CCC');
    expect(cache.map.size).toBe(3);

    cache.map.set(1, _.set(cache.map.get(1), 'ttl', Date.now() - 1));
    expect(cache.get(1)).toBeUndefined();
    expect(cache.map.size).toBe(2);

    cache.map.set(2, _.set(cache.map.get(2), 'ttl', Date.now() - 1));
    cache.clear();
    expect(cache.map.size).toBe(1);

    cache.clear(true);
    expect(cache.map.size).toBe(0);
  });

  it('clear job', () => {
    const cache = new TimeToLiveStore();

    cache.set(1, 'AAA');
    cache.set(2, 'BBB');
    expect(cache.map.size).toBe(2);

    cache.map.set(1, _.set(cache.map.get(1), 'ttl', Date.now() - 1));
    jest.runOnlyPendingTimers();
    expect(cache.map.size).toBe(1);
  });

  it('DataLoader', async () => {
    const load = jest.fn(Promise.resolve);
    const cacheMap = new TimeToLiveStore();
    const dataLoader = new DataLoader(load, { cacheMap });
    load.mockReturnValueOnce(Promise.resolve(['AAA']));
    load.mockReturnValueOnce(Promise.resolve(['CCC']));
    expect(await dataLoader.load(1)).toBe('AAA');
    expect(await dataLoader.load(3)).toBe('CCC');
    expect(cacheMap.map.size).toBe(2);

    expect(await dataLoader.load(1)).toBe('AAA');
  });
});
