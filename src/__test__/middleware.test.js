import faker from 'faker';
import { GraphQLInt } from 'graphql';
import { authentication } from '../middleware';
import Query from '../query';
import { UnauthorizedError } from '../error';

describe('afterware', () => {
  it('pagination', async () => {
    const id = faker.random.number();
    const resolve = jest.fn(() => faker.helpers.userCard());
    const middleware = jest.fn();

    const QueryAuthentication = class extends Query {
      type = GraphQLInt;
      resolve = resolve;
      middleware = [middleware, authentication];
    };
    const query = new QueryAuthentication();
    expect(query).toMatchSnapshot();

    let error;

    error = null;
    try { await query.resolve(); } catch (e) { error = e; }
    expect(error).toEqual(new UnauthorizedError('authorization header is required'));

    error = null;
    try { await query.resolve({}, {}, faker.random.word()); } catch (e) { error = e; }
    expect(error).toEqual(new UnauthorizedError('authorization header is required'));

    error = null;
    try { await query.resolve({}, {}, { user: { id } }, {}); } catch (e) { error = e; }
    expect(error).toBeNull();
  });
});
