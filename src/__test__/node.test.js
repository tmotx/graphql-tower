import faker from 'faker';
import { toGlobalId, fromGlobalId } from '../node';

it('toGlobalId & fromGlobalId', async () => {
  const type = faker.lorem.word();
  const id = `${faker.random.number()}`;

  const globalId = toGlobalId(type, id);
  expect(globalId).toBe(new Buffer(`${type}:${id}`, 'utf8').toString('base64'));

  const unbased = fromGlobalId(globalId);
  expect(unbased.getType()).toBe(type);
  expect(`${unbased}`).toBe(id);
});
