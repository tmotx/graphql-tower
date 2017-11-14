import 'babel-polyfill';
import _ from 'lodash';
import { thunk, combine, next, retry } from '../';

describe('helper', () => {
  it('thunk', async () => {
    expect(thunk({ name: 'yutin' })()).toEqual({ name: 'yutin' });
    expect(thunk(args => _.defaults(args, { name: 'yutin' }))({ age: 20 })).toEqual({ name: 'yutin', age: 20 });
    expect(thunk()({ age: 20 })).toBe(undefined);
  });

  it('combine', async () => {
    expect(combine(() => { throw new Error(); })).toBeInstanceOf(Function);
    await new Promise(setImmediate);
    expect(combine(() => { throw new Error(); }).promise).toBeInstanceOf(Promise);
    await new Promise(setImmediate);

    expect(await combine(args => (args), { title: 'yutin' })).toEqual({ title: 'yutin' });
    expect(await combine(args => Promise.resolve(args), { title: 'yutin' })({ age: 10 })).toEqual({ title: 'yutin', age: 10 });
    expect(combine(args => (args), { title: 'yutin' })({ age: 10 }))
      .toEqual(expect.objectContaining({ title: 'yutin', age: 10 }));
    expect(combine(args => (args), { title: 'yutin' })({ age: 10 }).promise)
      .toEqual(expect.objectContaining({ title: 'yutin', age: 10 }));
  });

  it('next', async () => {
    expect(next(() => { throw new Error(); })).toBeInstanceOf(Function);
    await new Promise(setImmediate);
    expect(next(() => { throw new Error(); }).promise).toBeInstanceOf(Promise);
    await new Promise(setImmediate);

    expect(await next((...args) => (args), { title: 'yutin' })).toEqual([{ title: 'yutin' }]);
    expect(await next((...args) => Promise.resolve(args), { title: 'yutin' })({ age: 10 })).toEqual([{ title: 'yutin' }, { age: 10 }]);
    expect(await next((...args) => (args))(undefined, { title: 'yutin' })({ age: 10 }))
      .toEqual([{ age: 10 }, { title: 'yutin' }]);
    expect(await next((...args) => (args))(undefined, { title: 'yutin' })({ age: 10 }).promise)
      .toEqual([{ age: 10 }, { title: 'yutin' }]);

    const nextTo = next((...args) => (args));
    Object.defineProperty(nextTo, 'isShow', { get: () => true });
    nextTo.maxNumber = 99;
    expect(nextTo.isShow).toBe(true);
    expect(nextTo({ title: 'yutin' })).toEqual(expect.objectContaining({ isShow: true, maxNumber: 99 }));
  });

  it('retry', async () => {
    const handler = jest.fn(() => Promise.reject(new Error()));
    await expect(retry(handler)).rejects.toEqual(new Error());
    expect(handler).toHaveBeenCalledTimes(4);

    handler.mockClear();
    handler.mockReturnValueOnce(Promise.reject(new Error()));
    handler.mockReturnValueOnce(Promise.resolve('ok'));
    await expect(retry(handler)).resolves.toBe('ok');
    expect(handler).toHaveBeenCalledTimes(2);

    handler.mockClear();
    handler.mockReturnValueOnce(Promise.resolve('ok'));
    await expect(retry(handler, 0)).resolves.toBe('ok');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
