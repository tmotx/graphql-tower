import faker from 'faker';
import { graphql, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { toGlobalId, fromGlobalId, GraphQLGlobalIdField } from '../node';

describe('node', () => {
  it('toGlobalId & fromGlobalId', () => {
    const type = faker.lorem.word();
    const id = `${faker.random.number()}`;

    const globalId = toGlobalId(type, id);
    expect(globalId).toBe(new Buffer(`${type}:${id}`, 'utf8').toString('base64'));

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

  it('GraphQLGlobalIdField', async () => {
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
});
