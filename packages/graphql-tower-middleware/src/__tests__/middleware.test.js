import faker from 'faker';
import { GraphQLInt } from 'graphql';
import { UnauthorizedError } from 'graphql-tower-errors';
import { Query } from 'graphql-tower-queries';
import { authentication } from '../';

describe('middleware', () => {
  it('authentication', async () => {
    const id = faker.random.number();
    const userCard = faker.helpers.userCard();
    const resolve = jest.fn(() => userCard);
    const middleware = jest.fn();

    const QueryAuthentication = class extends Query {
      type = GraphQLInt;
      resolve = resolve;
      middleware = [middleware, authentication];
    };
    const query = new QueryAuthentication();
    expect(query).toMatchSnapshot();

    await expect(query.resolve()).rejects.toEqual(new UnauthorizedError('authorization header is required'));

    await expect(query.resolve({}, {}, faker.random.word())).rejects.toEqual(new UnauthorizedError('authorization header is required'));

    await expect(query.resolve({}, {}, { user: { id } }, {})).resolves.toEqual(userCard);
  });
});
