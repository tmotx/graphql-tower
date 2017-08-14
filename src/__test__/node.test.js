import faker from 'faker';
import { graphql, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { toGlobalId, fromGlobalId, GraphQLGlobalIdField } from '../node';

describe('node', () => {
  it('isGlobalId & toGlobalId & fromGlobalId', () => {
    const type = 'GlobalType';

    expect(toGlobalId(type, '123456789')).toBe('iNg4tchz7wmADhj8X1lTUtPlTd1bWj');

    const buffer = Buffer.from(faker.random.locale());
    const GlobalBuffer = toGlobalId(type, buffer);
    expect(fromGlobalId(GlobalBuffer, type)).toBe(buffer.toString());

    const number = faker.random.number();
    const GlobalNumber = toGlobalId(type, number);
    expect(fromGlobalId(GlobalNumber, type)).toBe(`${number}`);

    const locale = faker.random.locale();
    const GlobalLocale = toGlobalId(type, locale);
    expect(fromGlobalId(GlobalLocale, type)).toBe(locale);

    const uuid = faker.random.uuid();
    const GlobalUUID = toGlobalId(type, uuid);
    expect(fromGlobalId(GlobalUUID, type)).toBe(uuid);

    const gid = fromGlobalId(toGlobalId(type, '123456789'));
    expect(gid.type).toBe(type);
    expect(gid.toString()).toEqual('123456789');

    expect(() => fromGlobalId(toGlobalId('abc', 1), 'xyz')).toThrowError(TypeError);
    expect(() => fromGlobalId('!@$')).toThrowError(TypeError);
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
