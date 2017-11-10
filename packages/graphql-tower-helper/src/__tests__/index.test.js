import _ from 'lodash';
import { thunk, next } from '../';

describe('helper', () => {
  it('thunk', async () => {
    expect(thunk({ name: 'yutin' })()).toEqual({ name: 'yutin' });
    expect(thunk(args => _.defaults(args, { name: 'yutin' }))({ age: 20 })).toEqual({ name: 'yutin', age: 20 });
    expect(thunk()({ age: 20 })).toBe(undefined);
  });

  it('next', async () => {
    expect(next(() => { throw new Error(); })).toBeInstanceOf(Promise);
    await new Promise(setImmediate);

    expect(await next(args => (args), { name: 'yutin' })).toEqual({ name: 'yutin' });
    expect(await next(next(args => Promise.resolve(args), { name: 'yutin' }), { age: 10 })).toEqual({ name: 'yutin', age: 10 });
    expect(next(next(args => (args), { name: 'yutin' }), { age: 10 }))
      .toEqual(expect.objectContaining({ name: 'yutin', age: 10 }));
  });
});
