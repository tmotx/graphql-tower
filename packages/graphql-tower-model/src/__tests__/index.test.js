import knex, { client } from 'jest-mock-knex';
import _ from 'lodash';
import faker from 'faker';
import { toGlobalId, fromGlobalId } from 'graphql-tower-global-id';
import { NotFoundError } from 'graphql-tower-errors';
import Model, { ValueColumn, HashColumn } from '../';

process.setMaxListeners(0);

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
    password: new HashColumn(),
    data: new ValueColumn(Object),
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

describe('model', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('default_table');

    await database.schema.createTable('default_table', (table) => {
      table.increments();
      table.string('name');
      table.text('password');
      table.specificType('keyword', 'tsvector');
      table.jsonb('data');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await database('default_table').insert({ name: 'name is one' });
    await database('default_table').insert({ name: 'name is two' });
  });

  afterAll(() => database.destroy());

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

    it('queryBuilder', () => {
      expect(Default.queryBuilder.toString()).toBe('select * from "default_table"');
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
        class DirectDelete extends NoOperator {
          static softDelete = false;
        }
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
        expect(cache.prime).toHaveBeenCalledWith(toGlobalId('NoOperator', '6'), expect.anything());
      });
    });

    describe('update of save', async () => {
      it('has operator', async () => {
        const model = await Default.load(4);

        await model.save(20);

        model.name = 'name is update';
        await model.save(20);

        await model.save(20, { name: 'name is action' });
        expect(client).toMatchSnapshot();

        await expect(model.save(null, { name: 'new is update again' }))
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator', async () => {
        const model = await NoOperator.load(6);
        await model.save(null, { name: 'name is no operator update' });
        expect(client).toMatchSnapshot();
      });
    });

    describe('destroy', () => {
      it('has operator', async () => {
        const model = await Default.load(4);

        await expect(model.destroy())
          .rejects.toEqual(new Error('operator is required'));

        await model.destroy(10);

        await model.destroy(10);
        expect(client).toMatchSnapshot();
      });

      it('no operator', async () => {
        const model = await NoOperator.load(5);
        await model.destroy();
        expect(client).toMatchSnapshot();
      });

      it('is not soft delete', async () => {
        class DirectDelete extends NoOperator {
          static softDelete = false;
        }
        const model = await DirectDelete.load(6);
        model.cache = { clear: jest.fn() };

        await model.destroy();
        expect(client).toMatchSnapshot();
        expect(model.cache.clear).toHaveBeenCalledWith(toGlobalId('DirectDelete', 6));
      });
    });

    it('fetch', async () => {
      const model = new Default({ name: 'name is one', data: { xyz: 1 } });
      await model.fetch();
      expect(model.valueOf()).toMatchSnapshot();
      expect(client).toMatchSnapshot();

      await expect((new Default({ name: 'one' })).fetch())
        .resolves.toEqual(null);
      await expect((new Default({ name: 'one' })).fetch(NotFoundError))
        .rejects.toEqual(new NotFoundError());
    });

    it('fetch with where', async () => {
      const model = new Default();
      model.where({ name: 'name is one' });
      await model.fetch();
      expect(model.valueOf()).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    describe('fetchAll', () => {
      it('no cache', async () => {
        const model = new Default({ name: 'name is one' });
        expect(_.map(await model.fetchAll(), data => data.name)).toMatchSnapshot();
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

    it('addKeyValue', async () => {
      const model = await Default.load(1);

      expect(model.valueOf('data')).toBe(null);
      await model.addKeyValue('data', '10', 'xyz');
      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });

      expect(client).toMatchSnapshot();
    });

    it('delKeyValue', async () => {
      const model = await Default.load(1);

      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });
      await model.delKeyValue('data', '10');
      expect(model.valueOf('data')).toEqual({});

      expect(client).toMatchSnapshot();
    });

    it('search', async () => {
      await (new Default({ name: 'new for action' })).save('10');
      await (new Default({ name: 'new for search' })).save('10');
      const model = new Default();
      model.search('new');
      expect(_.map(await model.fetchAll(), data => data.name)).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });
});
