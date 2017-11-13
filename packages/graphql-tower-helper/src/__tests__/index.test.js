import _ from 'lodash';
import { thunk, combine, next } from '../';

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
  });
});
