import faker from 'faker';
import base from 'base-x';
import { graphql, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { toGlobalId, fromGlobalId, GraphQLGlobalIdField } from '../node';

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

describe('node', () => {
  it('toGlobalId & fromGlobalId', () => {
    const type = faker.lorem.word();
    const id = `${faker.random.number()}`;

    const globalId = toGlobalId(type, id);
    expect(globalId).toBe(bs62.encode(Buffer.from(`${type}:${id}`)));

    const gid = fromGlobalId(globalId);
    expect(gid.type).toBe(type);
    expect(gid.id).toBe(id);
    expect(`${gid}`).toBe(id);

    const nid = fromGlobalId(globalId, type);
    expect(nid).toBe(id);

    expect(() => fromGlobalId(toGlobalId(type, ''))).toThrowError(TypeError);
    expect(() => fromGlobalId(toGlobalId(type, 0))).toThrowError(TypeError);
    expect(() => fromGlobalId(toGlobalId('abc', 1), 'xyz')).toThrowError(TypeError);
  });

  describe('GraphQLGlobalIdField', () => {
    const resolve = jest.fn();

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: {
            type: new GraphQLObjectType({
              name: 'Node',
              fields: {
                id: new GraphQLGlobalIdField(),
                customId: new GraphQLGlobalIdField('custom'),
              },
            }),
            resolve,
          },
        },
      }),
    });

    it('when resolve is object', async () => {
      const reply = {
        id: faker.random.number(),
        customId: faker.random.number(),
      };

      resolve.mockClear();
      resolve.mockReturnValueOnce(reply);
      const result = await graphql(schema, 'query { node { id customId } }');
      expect(result.data.node).toEqual({
        id: toGlobalId('Node', reply.id),
        customId: toGlobalId('custom', reply.customId),
      });
    });

    it('when resolve is string', async () => {
      const reply = faker.random.number();

      resolve.mockClear();
      resolve.mockReturnValueOnce(reply);
      const result = await graphql(schema, 'query { node { id customId } }');
      expect(result.data.node).toEqual({
        id: toGlobalId('Node', reply),
        customId: toGlobalId('custom', reply),
      });
    });
  });
});
