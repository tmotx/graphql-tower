import knex, { client } from 'knex';
import _ from 'lodash';
import faker from 'faker';
import { graphql, GraphQLSchema, GraphQLNonNull, GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt } from 'graphql';
import { toGlobalId, fromGlobalId } from 'graphql-tower-global-id';
import { Mutation } from 'graphql-tower-queries';
import { NotFoundError } from 'graphql-tower-errors';
import Model, { ValueColumn, HashColumn, ListColumn } from '../';

const resolve = jest.fn();

const UpdateMutation = class extends Mutation {
  inputFields = {
    name: { type: new GraphQLNonNull(GraphQLString) },
    total: { type: GraphQLInt },
  }

  outputFields = {
    status: { type: GraphQLInt },
  }

  resolve = resolve;
};

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      node: {
        type: new GraphQLObjectType({
          name: 'Node',
          fields: { id: { type: GraphQLID } },
        }),
        resolve,
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      update: new UpdateMutation(),
    },
  }),
});

const database = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: null,
    database: 'graphql_tower',
  },
});


class Default extends Model {
  static database = database;

  static tableName = 'default_table';

  static hasOperator = true;

  static toKeyword = data => data.name;

  static columns = {
    name: new ValueColumn(),
    nickName: new ValueColumn(),
    password: new HashColumn(),
    userIds: new ListColumn(),
    data: new ValueColumn(Object),
    total: new ValueColumn(Number),
  }
}

class NoOperator extends Model {
  static database = database;

  static tableName = 'default_table';

  static hasTimestamps = false;

  static columns = {
    name: new ValueColumn(),
  }
}

class DirectDelete extends NoOperator {
  static softDelete = false;
}

class BatchInsert extends Model {
  static database = database;

  static hasOperator = true;

  static tableName = 'batch_insert';

  static columns = {
    name: new ValueColumn(),
  }
}

class NoBatchInsert extends Model {
  static database = database;

  static hasTimestamps = false;

  static tableName = 'batch_insert';

  static columns = {
    name: new ValueColumn(),
  }
}

describe('model', () => {
  beforeAll(async () => {
    await database.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await database.schema.dropTableIfExists('default_table');

    await database.schema.createTable('default_table', (table) => {
      table.increments();
      table.string('name');
      table.string('nick_name');
      table.text('password');
      table.specificType('keyword', 'tsvector');
      table.specificType('user_ids', 'bigint[]');
      table.jsonb('data');
      table.timestamps();
      table.integer('total').defaultTo(0);
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await database.schema.dropTableIfExists('batch_insert');

    await database.schema.createTable('batch_insert', (table) => {
      table.uuid('id').primary().defaultTo(database.raw('uuid_generate_v1mc()'));
      table.string('name');
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  });

  afterAll(() => database.destroy());

  beforeEach(async () => {
    await Default.query.truncate();
    await database('default_table').insert({ name: 'name is one', nick_name: 'nick name is one' });
    await database('default_table').insert({ name: 'name is two', data: { 10: 'xyz' }, user_ids: ['10', '20'] });
    client.mockClear();
  });

  describe('static', () => {
    describe('columns', () => {
      it('object', () => {
        expect(Default.columns).toMatchSnapshot();
      });

      it('thunk', () => {
        class Thunk extends Model {
          static database = database;

          static tableName = 'default_table';

          static columns = () => ({
            name: new ValueColumn(),
            password: new HashColumn(),
            data: new ValueColumn(Object),
          })
        }

        expect(Thunk.columns).toMatchSnapshot();
      });
    });

    it('displayName', () => {
      expect(Default.displayName).toBe('Default');
    });

    it('dataloader', () => {
      expect(Default.dataloader).toMatchSnapshot();
    });

    it('query', () => {
      expect(Default.query.toString()).toBe('select * from "default_table"');
    });

    it('raw', () => {
      expect(Default.raw('name = ?', [10]).toString()).toBe('name = 10');
    });

    describe('batchInsert', () => {
      it('successfully insert', async () => {
        const results = await BatchInsert.batchInsert(_.map(_.range(1, 10000), idx => ({ name: `x${idx}` })), '99');
        expect(results.length).toBe(9999);
      });

      it('operator is required', async () => {
        await expect(BatchInsert.batchInsert(
          _.map(_.range(1, 100), idx => ({ name: `x${idx}` })),
        )).rejects.toEqual(new Error('operator is required'));
      });

      it('successfully insert when no operator', async () => {
        const results = await NoBatchInsert.batchInsert(_.map(_.range(1, 100), idx => ({ name: `x${idx}` })));
        expect(results.length).toBe(99);
      });
    });

    describe('toGlobalId & fromGlobalId', () => {
      it('integer', () => {
        expect(Default.toGlobalId('2020')).toBe('iN253oitK2hyYmJ0DwULEnzw');
        expect(Default.fromGlobalId('iN253oitK2hyYmJ0DwULEnzw')).toBe('2020');

        expect(() => Default.fromGlobalId(toGlobalId('type', '2020'))).toThrowErrorMatchingSnapshot();
        expect(fromGlobalId(Default.toGlobalId('2020')).type).toBe('Default');
      });

      it('uuid', () => {
        class UUID extends Model {
          static database = database;

          static tableName = 'default_table';

          static hasUUID = true;

          static columns = {
            name: new ValueColumn(),
          }
        }

        expect(UUID.toGlobalId('131d069a-8b6e-45d1-af3b-c25c598e06be')).toBe('iUoGyNJVqL88oyTqyk8qPQooAkDN6s');
        expect(UUID.fromGlobalId('iUoGyNJVqL88oyTqyk8qPQooAkDN6s')).toBe('131d069a-8b6e-45d1-af3b-c25c598e06be');

        expect(() => UUID.fromGlobalId(toGlobalId('UUID', '2020'))).toThrowError(new TypeError());
      });
    });

    it('format && signify', () => {
      expect(Default.format({ is_admin: true })).toEqual({ isAdmin: true });
      expect(Default.signify({ isAdmin: true })).toEqual({ is_admin: true });
    });

    it('forge', () => {
      expect(Default.forge({ name: 'my name' })).toMatchSnapshot();
    });

    describe('load && loadMany', () => {
      it('softDelete', async () => {
        expect(await Default.load()).toBe(null);

        expect(await Default.load(1)).toEqual(expect.objectContaining({ name: 'name is one' }));

        const results = await Promise.all([Default.load(1), Default.loadMany([1, 2])]);
        expect(results).toEqual([
          expect.objectContaining({ name: 'name is one' }),
          [expect.objectContaining({ name: 'name is one' }), expect.objectContaining({ name: 'name is two' })],
        ]);

        expect(client).toMatchSnapshot();

        await expect(Default.load(99))
          .resolves.toEqual(null);
        await expect(Default.load(99, Error))
          .rejects.toEqual(new Error());
        await expect(Default.load(99, NotFoundError))
          .rejects.toEqual(new NotFoundError());
        await expect(Default.loadMany([99]))
          .resolves.toEqual([null]);
        await expect(Default.loadMany([99], NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('no soft delete', async () => {
        const model = new Default({ name: 'for no soft delete load' });
        await (await model.save(10)).destroy(10);
        expect(await DirectDelete.load(3))
          .toEqual(expect.objectContaining({ name: 'for no soft delete load' }));
        expect(client).toMatchSnapshot();
      });

      it('when has cache', async () => {
        const cache = { load: jest.fn() };
        await Default.load('10', cache);
        expect(cache.load).toHaveBeenCalledWith(toGlobalId('Default', '10'));
        expect(cache.load).toHaveBeenCalledTimes(1);
      });
    });

    it('isUUID', () => {
      expect(Default.isUUID(faker.random.uuid())).toBe(true);
      expect(Default.isUUID('XYZ')).toBe(false);
    });

    it('fromModel', () => {
      expect(Default.fromModel('20')).toBe('20');
      expect(Default.fromModel({ nativeId: '20' })).toBe('20');
      expect(Default.fromModel(null)).toBe(null);
    });
  });

  describe('model', () => {
    it('set', () => {
      const model = new Default({ name: 'isme', price: 99, total: undefined });
      expect(model.valueOf()).toEqual({ name: 'isme' });
      model.set({ name: 'new name', price: 99, total: undefined });
      expect(model.valueOf()).toEqual({ name: 'new name' });
    });

    it('isNew', () => {
      const model = new Default();
      expect(model.isNew).toBe(true);

      model.id = '20';
      expect(model.isNew).toBe(false);
    });

    it('changes', async () => {
      const model = await Default.load(1);
      expect(model.changes).toEqual({});

      model.name = 'a new name';
      expect(model.changes).toEqual({ name: 'a new name' });
    });

    it('query', async () => {
      const model = new Default();
      expect(model.queryBuilder.toString()).toBe('select * from "default_table"');
      expect(model.query.toString()).toBe('select * from "default_table" where "deleted_at" is null');
    });

    it('nativeId', async () => {
      const model = await Default.load(1);
      expect(model.id).toBe('iN253oitK2hyYmJ0DwULEnTN');
      expect(model.nativeId).toBe(1);
    });

    describe('forge & valueOf', () => {
      it('from object', () => {
        const data = { name: 'a name' };
        const model = (new Default()).forge(data);
        expect(model.valueOf()).not.toBe(data);
        expect(model._.previous).toBe(data);
      });

      it('from model', async () => {
        const model = await Default.load(1);
        const other = (new Default()).forge(model);
        expect(other.valueOf()).not.toBe(model.valueOf());
        expect(other._.previous).toBe(model._.previous);
      });
    });

    it('clone', async () => {
      const model = await Default.load(1);
      model.name = 'new model one';

      const newModel = model.clone();
      expect(model).toEqual(newModel);
      expect(model._.previous).toBe(newModel._.previous);
      expect(model._.current).not.toBe(newModel._.current);

      newModel.name = 'new model clone';
      expect(model.name).toBe('new model one');
      expect(model.valueOf()).not.toEqual(newModel.valueOf());
    });

    it('merge', async () => {
      const model = await Default.load(1);
      model.merge({ name: 'a name', archive: { items: [20, 40] } });
      expect(model._).toMatchSnapshot();
    });

    it('hash & verify', async () => {
      const model = await Default.load(1);
      model.set({ password: 'XYZ2020' });
      expect(model.verify('password', 'XYZ2020')).toBe(true);
      expect(model.verify('password', 'XYZ2049')).toBe(false);
    });

    it('prime && clear', async () => {
      const cache = { prime: jest.fn(), clear: jest.fn() };
      const model = new Default({}, { cache });

      model.prime();
      expect(cache.prime).toHaveBeenCalledTimes(0);
      model.clear();
      expect(cache.clear).toHaveBeenCalledTimes(0);

      model.id = 10;
      model.prime();
      expect(cache.prime).toHaveBeenCalledTimes(1);
      model.clear();
      expect(cache.clear).toHaveBeenCalledTimes(1);
    });

    describe('insert of save', () => {
      it('has operator', async () => {
        await (new Default({ name: 'new is insert' })).save(10);
        await (new Default()).save(10, { name: 'new is action' });
        expect(client).toMatchSnapshot();

        await expect((new Default()).save(null, { name: 'new is insert again' }))
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator', async () => {
        const cache = { prime: jest.fn() };
        const model = new NoOperator({}, { cache });
        await model.save(null, { name: 'new is no operator insert' });
        expect(client).toMatchSnapshot();
        expect(cache.prime).toHaveBeenCalledWith(toGlobalId('NoOperator', '3'), expect.anything());
      });
    });

    describe('update of save', async () => {
      it('has operator', async () => {
        const model = await Default.load(1);

        await model.save(20);

        model.name = 'name is update';
        await model.save(20);

        await model.save(20, { name: 'name is action' });
        expect(client).toMatchSnapshot();

        await expect(model.save(null, { name: 'new is update again' }))
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator', async () => {
        const model = await NoOperator.load(1);
        await model.save(null, { name: 'name is no operator update' });
        expect(client).toMatchSnapshot();
      });
    });

    describe('destroy', () => {
      it('has operator', async () => {
        const model = await Default.load(1);

        await expect(model.destroy())
          .rejects.toEqual(new Error('operator is required'));

        await model.destroy(10);

        await model.destroy(10);
        expect(client).toMatchSnapshot();
      });

      it('batch', async () => {
        const one = await Default.load(1);
        const two = await Default.load(2);
        await Promise.all([one.destroy('10'), two.destroy('10')]);
        expect(await new Default().fetchAll()).toEqual([]);
        expect(client).toMatchSnapshot();
        expect(client).toHaveBeenCalledTimes(4);
      });

      it('no operator', async () => {
        const model = await NoOperator.load(1);
        await model.destroy();
        expect(client).toMatchSnapshot();
      });

      it('is not soft delete', async () => {
        const model = await DirectDelete.load(1);
        model.cache = { clear: jest.fn() };

        expect(model.query.toString()).toBe('select * from "default_table" where "id" = 1');

        await model.destroy();
        expect(client).toMatchSnapshot();
        expect(model.cache.clear).toHaveBeenCalledWith(toGlobalId('DirectDelete', 1));
      });
    });

    describe('fetch', () => {
      it('fetch one', async () => {
        const model = new Default({ name: 'name is one', data: { xyz: 1 } });
        await model.fetch();
        expect(model.valueOf()).toMatchSnapshot();
        expect(client).toMatchSnapshot();

        await expect((new Default({ name: 'one' })).fetch())
          .resolves.toEqual(null);
        await expect((new Default({ name: 'one' })).fetch(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('with where', async () => {
        const model = new Default();
        model.where({ nickName: 'nick name is one' });
        model.where(function where() { return this.where('name', 'name is one'); });
        model.orderBy('createdAt');
        model.whereRaw('data IS NULL');
        await model.fetch();
        expect(model.valueOf()).toMatchSnapshot();
        expect(client).toMatchSnapshot();
      });
    });

    it('fetchOrInsert', async () => {
      expect((await new Default({ name: 'name is one' }).fetchOrInsert()).nativeId).toBe(1);
      expect((await new Default({ name: 'name is new' }).fetchOrInsert('10')).nativeId).toBe(3);
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(3);
    });

    describe('fetchAll', () => {
      it('no cache', async () => {
        const model = new Default({ name: 'name is one' });

        const results = await model.fetchAll();
        expect(results.totalCount).toBe(1);
        expect(_.map(results, data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();

        await expect((new Default({ name: 'one' })).fetchAll())
          .resolves.toEqual([]);
        await expect((new Default({ name: 'one' })).fetchAll(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('cache', async () => {
        const model = new Default({ name: 'name is one' });
        model.cache = { prime: jest.fn() };
        await model.fetchAll();
        expect(model.cache.prime).toHaveBeenCalledWith(toGlobalId('Default', 1), expect.anything());
      });
    });

    describe('fetchPage', () => {
      it('offset and first', async () => {
        const model = new Default();
        const results = await model.fetchPage({ offset: 1, first: 2 });
        expect(results.totalCount).toBe(2);
        expect(_.map(results, data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();
      });

      it('not set', async () => {
        const model = new Default();
        const results = await model.fetchPage();
        expect(results.totalCount).toBe(2);
        expect(_.map(results, data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();
      });
    });

    describe('fetchCount', () => {
      it('fetch 1', async () => {
        const model = new Default({ name: 'name is one' });
        expect(await model.fetchCount()).toBe(1);
      });

      it('fetch 0', async () => {
        const model = new Default({ name: 'name is XYZ' });
        await expect(model.fetchCount(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });
    });

    it('addKeyValue', async () => {
      const model = await Default.load(1);

      expect(model.valueOf('data')).toBe(null);
      await model.addKeyValue('data', '10', 'xyz');
      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });

      expect(client).toMatchSnapshot();
    });

    it('delKeyValue', async () => {
      const model = await Default.load(2);

      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });
      await model.delKeyValue('data', '10');
      expect(model.valueOf('data')).toEqual({});

      expect(client).toMatchSnapshot();
    });

    it('appendValue', async () => {
      const model = await Default.load(1);

      await model.appendValue('userIds', '10');
      expect(model.userIds).toEqual(['10']);

      await model.appendValue('userIds', '20');
      expect(model.userIds).toEqual(['10', '20']);

      expect((await Default.load(1)).userIds).toEqual(['10', '20']);

      await model.appendValue('userIds', '10');
      expect(model.userIds).toEqual(['20', '10']);
      expect((await Default.load(1)).userIds).toEqual(['20', '10']);
    });

    it('removeValue', async () => {
      const model = await Default.load(2);

      await model.removeValue('userIds', '10');
      expect(model.userIds).toEqual(['20']);

      expect((await (await Default.load(1)).removeValue('userIds', '10')).userIds).toEqual([]);
    });

    describe('increment', () => {
      it('single', async () => {
        const model = await Default.load(1);
        expect(model.total).toBe(0);
        await model.increment('total', 10);

        expect(model.total).toBe(10);
        expect((await Default.load(1)).total).toBe(10);

        expect(await model.where('total', 30).increment('total', 10)).toBe(false);
      });

      it('multiple', async () => {
        const model = await Default.load(1);
        expect(model.total).toBe(0);
        await model.increment({ total: 10 });

        expect(model.total).toBe(10);
        expect((await Default.load(1)).total).toBe(10);

        await expect(model.where('total', 30).increment({ total: 10 }, Error)).rejects.toEqual(new Error());
      });
    });

    it('search', async () => {
      await (new Default({ name: 'new for action' })).save('10');
      await (new Default({ name: 'new for search' })).save('10');
      const model = new Default();
      model.search('new');

      const results = await model.fetchAll();
      expect(results.totalCount).toBe(2);
      expect(_.map(results, data => data.name)).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });

  describe('graphql', () => {
    it('successfully get from load', async () => {
      resolve.mockImplementationOnce(() => Default.load('1'));
      const reply = await graphql(schema, 'query { node { id } }');
      expect(reply).toEqual({ data: { node: { id: Default.toGlobalId('1') } } });
    });
  });
});
