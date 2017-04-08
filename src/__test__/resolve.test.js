import faker from 'faker';
import { UnauthorizedError, resolveWithAuth } from '../resolve';

describe('resolve', () => {
  it('UnauthorizedError', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('unknown error');
  });

  it('resolveWithAuth', async () => {
    const id = faker.random.number();
    const handler = jest.fn();
    const resolve = resolveWithAuth(handler);

    let error1;
    try {
      await resolve();
    } catch (e) { error1 = e; }
    expect(() => { throw error1; }).toThrowError(UnauthorizedError);

    let error2;
    try {
      await resolve({}, {}, faker.random.word());
    } catch (e) { error2 = e; }
    expect(() => { throw error2; }).toThrowError(UnauthorizedError);

    handler.mockClear();
    let error3;
    try {
      await resolve({}, {}, { user: { id } }, {});
    } catch (e) { error3 = e; }
    expect(() => { throw error3; }).not.toThrowError();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith({}, {}, { user: { id } }, {});
  });
});
