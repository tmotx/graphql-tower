import _ from 'lodash';
import { NotFoundError } from 'graphql-tower-errors';
import { thunk, coalesce, next, combine, functional, retry, displayName, assertResult, batch } from '../';

describe('helper', () => {
  it('thunk', async () => {
    expect(thunk({ name: 'yutin' })()).toEqual({ name: 'yutin' });
    expect(thunk(args => _.defaults(args, { name: 'yutin' }))({ age: 20 })).toEqual({ name: 'yutin', age: 20 });
    expect(thunk()({ age: 20 })).toBe(undefined);
  });

  it('coalesce', async () => {
    expect(coalesce(undefined, null, 0, 1)).toBe(0);
    expect(coalesce(undefined, null, '', 'XYZ')).toBe('');
    expect(coalesce(undefined, null)).toBe('');
  });

  describe('combine', () => {
    it('throw error', async () => {
      const handler = jest.fn();
      expect(combine(handler)).toBeInstanceOf(Function);
      expect(combine(handler).promise).toBeInstanceOf(Promise);
      await new Promise(setImmediate);
      expect(handler).toHaveBeenCalledTimes(0);

      await expect(combine(() => { throw new Error(); })).rejects.toEqual(new Error());
      await expect(combine(() => { throw new Error(); }).then()).rejects.toEqual(new Error());
    });

    it('promise', async () => {
      expect(await combine(args => (args), { title: 'yutin' })).toEqual({ title: 'yutin' });
      expect(await combine(args => Promise.resolve(args), { title: 'yutin' })({ age: 10 })).toEqual({ title: 'yutin', age: 10 });
      expect(combine(args => (args), { title: 'yutin' })({ age: 10 }))
        .toEqual(expect.objectContaining({ title: 'yutin', age: 10 }));
      expect(combine(args => (args), { title: 'yutin' })({ age: 10 }).promise)
        .toEqual(expect.objectContaining({ title: 'yutin', age: 10 }));

      const { promise } = combine(() => {});
      expect(typeof promise).toBe('object');
      expect(typeof promise.then).toBe('function');
    });

    it('multi promise', async () => {
      const handler = jest.fn(() => Promise.resolve('x'));
      const promise = combine(handler);
      const results = await Promise.all([promise, promise]);
      expect(results).toEqual(['x', 'x']);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('functional', () => {
    it('throw error', async () => {
      const handler = jest.fn();
      expect(functional(handler)).toBeInstanceOf(Function);
      expect(functional(handler).promise).toBeInstanceOf(Promise);
      await new Promise(setImmediate);
      expect(handler).toHaveBeenCalledTimes(0);

      await expect(functional(() => { throw new Error(); })).rejects.toEqual(new Error());
      await expect(functional(() => { throw new Error(); }).then()).rejects.toEqual(new Error());
    });

    it('promise', async () => {
      expect(await functional((...args) => (args), { title: 'yutin' })).toEqual([{ title: 'yutin' }]);
      expect(await functional((...args) => Promise.resolve(args), { title: 'yutin' })({ age: 10 })).toEqual([{ title: 'yutin' }, { age: 10 }]);
      expect(await functional((...args) => (args))(undefined, { title: 'yutin' })({ age: 10 }))
        .toEqual([{ age: 10 }, { title: 'yutin' }]);
      expect(await functional((...args) => (args))(undefined, { title: 'yutin' })({ age: 10 }).promise)
        .toEqual([{ age: 10 }, { title: 'yutin' }]);

      const { promise } = functional(() => {});
      expect(typeof promise).toBe('object');
      expect(typeof promise.then).toBe('function');
    });

    it('multi promise', async () => {
      const handler = jest.fn(() => Promise.resolve('x'));
      const promise = functional(handler);
      const results = await Promise.all([promise, promise]);
      expect(results).toEqual(['x', 'x']);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('defineProperty', () => {
      const functionalTo = functional((...args) => (args));
      Object.defineProperty(functionalTo, 'isShow', { get: () => true });
      functionalTo.maxNumber = 99;
      expect(functionalTo.isShow).toBe(true);
      expect(functionalTo({ title: 'yutin' })).toEqual(expect.objectContaining({ isShow: true, maxNumber: 99 }));
    });
  });

  describe('next', () => {
    it('throw error', async () => {
      const handler = jest.fn();
      expect(next(handler)).toBeInstanceOf(Promise);
      await new Promise(setImmediate);
      expect(handler).toHaveBeenCalledTimes(0);

      await expect(next(() => { throw new Error(); })).rejects.toEqual(new Error());
      await expect(next(() => { throw new Error(); }).then()).rejects.toEqual(new Error());
    });

    it('multi promise', async () => {
      const handler = jest.fn(() => Promise.resolve('x'));
      const promise = next(handler);
      const results = await Promise.all([promise, promise]);
      expect(results).toEqual(['x', 'x']);
      expect(handler).toHaveBeenCalledTimes(1);
    });
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

  it('displayName', () => {
    class DisplayApp { static displayName = 'App'; }
    expect(displayName(DisplayApp)).toBe('App');

    class App {}
    expect(displayName(App)).toBe('App');

    expect(displayName({})).toBe('Unknown');
  });

  it('assertResult', async () => {
    expect(() => assertResult(0, Error)).toThrowError();
    expect(() => assertResult(false, Error)).toThrowError();
    expect(() => assertResult(undefined, Error)).toThrowError();
    expect(() => assertResult(null, Error)).toThrowError();
    expect(() => assertResult(null, NotFoundError)).toThrowError();

    expect(() => assertResult(1, Error)).not.toThrowError();
    expect(() => assertResult(true, Error)).not.toThrowError();
    expect(assertResult(null)).toBe(null);
  });

  it('batch', async () => {
    const handler = jest.fn(() => Promise.resolve());
    const tasker = batch(handler);

    expect(await Promise.all([tasker('a'), tasker('b')])).toEqual([undefined, undefined]);
    expect(handler).toHaveBeenLastCalledWith(['a', 'b']);

    handler.mockReturnValueOnce(Promise.reject(new Error('throw error')));
    await expect(Promise.all([tasker('a'), tasker('b')])).rejects.toEqual(new Error('throw error'));

    let times = 0;
    let promiseContinue;
    const pass = () => {
      times += 1;
      if (times >= 2) promiseContinue();
    };
    const resolve = jest.fn(pass);
    const reject = jest.fn(pass);
    handler.mockReturnValueOnce(Promise.resolve(['ok', new Error()]));
    tasker('a').then(resolve, reject);
    tasker('b').then(resolve, reject);

    await new Promise((promise) => { promiseContinue = promise; });
    expect(resolve).toHaveBeenLastCalledWith('ok');
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(reject).toHaveBeenLastCalledWith(new Error());
    expect(reject).toHaveBeenCalledTimes(1);

    handler.mockClear();
    await tasker('a');
    await tasker('b');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
