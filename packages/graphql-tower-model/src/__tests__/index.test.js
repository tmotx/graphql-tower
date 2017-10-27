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


class DefaultModel extends Model {
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

class NoOperatorModel extends Model {
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
        expect(DefaultModel.columns).toMatchSnapshot();
      });

      it('thunk', () => {
        class ThunkModel extends Model {
          static database = database;

          static tableName = 'default_table';

          static columns = () => ({
            name: new ValueColumn(),
            password: new HashColumn(),
            data: new ValueColumn(Object),
          })
        }

        expect(ThunkModel.columns).toMatchSnapshot();
      });
    });

    it('dataloader', () => {
      expect(DefaultModel.dataloader).toMatchSnapshot();
    });

    it('queryBuilder', () => {
      expect(DefaultModel.queryBuilder.toString()).toBe('select * from "default_table"');
    });

    describe('toGlobalId & fromGlobalId', () => {
      it('integer', () => {
        expect(DefaultModel.toGlobalId('2020')).toBe('iN3wDu0PJew8f0Jmr3hvaGDUPVMrPibs');
        expect(DefaultModel.fromGlobalId('iN3wDu0PJew8f0Jmr3hvaGDUPVMrPibs')).toBe('2020');

        expect(() => DefaultModel.fromGlobalId(toGlobalId('type', '2020'))).toThrowErrorMatchingSnapshot();
        expect(fromGlobalId(DefaultModel.toGlobalId('2020')).type).toBe('default_table');
      });

      it('uuid', () => {
        class UUIDModel extends Model {
          static database = database;

          static tableName = 'default_table';

          static hasUUID = true;

          static columns = {
            name: new ValueColumn(),
          }
        }

        expect(UUIDModel.toGlobalId('131d069a-8b6e-45d1-af3b-c25c598e06be')).toBe('iU1OZjz0bCBYpXCysIj8ELxRnJZZZRdhoTS1EaGgcve');
        expect(UUIDModel.fromGlobalId('iU1OZjz0bCBYpXCysIj8ELxRnJZZZRdhoTS1EaGgcve')).toBe('131d069a-8b6e-45d1-af3b-c25c598e06be');

        expect(() => UUIDModel.fromGlobalId(toGlobalId('default_table', '2020'))).toThrowErrorMatchingSnapshot();
      });
    });

    it('format && signify', () => {
      expect(DefaultModel.format({ is_admin: true })).toEqual({ isAdmin: true });
      expect(DefaultModel.signify({ isAdmin: true })).toEqual({ is_admin: true });
    });

    it('forge', () => {
      expect(DefaultModel.forge({ name: 'my name' })).toMatchSnapshot();
    });

    describe('load && loadMany', () => {
      it('softDelete', async () => {
        expect(await DefaultModel.load()).toBe(null);

        expect(await DefaultModel.load(1)).toEqual(expect.objectContaining({ name: 'name is one' }));

        const results = await Promise.all([DefaultModel.load(1), DefaultModel.loadMany([1, 2])]);
        expect(results).toEqual([
          expect.objectContaining({ name: 'name is one' }),
          [expect.objectContaining({ name: 'name is one' }), expect.objectContaining({ name: 'name is two' })],
        ]);

        expect(client).toMatchSnapshot();

        await expect(DefaultModel.load(99))
          .resolves.toEqual(null);
        await expect(DefaultModel.load(99, NotFoundError))
          .rejects.toEqual(new NotFoundError());
        await expect(DefaultModel.loadMany([99]))
          .resolves.toEqual([null]);
        await expect(DefaultModel.loadMany([99], NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('no soft delete', async () => {
        class DirectDelete extends NoOperatorModel {
          static softDelete = false;
        }
        const model = new DefaultModel({ name: 'for no soft delete load' });
        await (await model.save(10)).destroy(10);
        expect(await DirectDelete.load(3))
          .toEqual(expect.objectContaining({ name: 'for no soft delete load' }));
        expect(client).toMatchSnapshot();
      });
    });

    it('isUUID', () => {
      expect(DefaultModel.isUUID(faker.random.uuid())).toBe(true);
      expect(DefaultModel.isUUID('XYZ')).toBe(false);
    });

    it('fromModel', () => {
      expect(DefaultModel.fromModel('20')).toBe('20');
      expect(DefaultModel.fromModel({ nativeId: '20' })).toBe('20');
      expect(DefaultModel.fromModel(null)).toBe(null);
    });
  });

  describe('model', () => {
    it('isNew', () => {
      const model = new DefaultModel();
      expect(model.isNew).toBe(true);

      model.id = '20';
      expect(model.isNew).toBe(false);
    });

    it('changes', async () => {
      const model = await DefaultModel.load(1);
      expect(model.changes).toEqual({});

      model.name = 'a new name';
      expect(model.changes).toEqual({ name: 'a new name' });
    });

    it('query', async () => {
      const model = new DefaultModel();
      expect(model.queryBuilder.toString()).toBe('select * from "default_table"');
      expect(model.query.toString()).toBe('select * from "default_table" where "deleted_at" is null');
    });

    it('nativeId', async () => {
      const model = await DefaultModel.load(1);
      expect(model.id).toBe('iN3wDu0PJew8f0Jmr3hvaGDUPVMrPi5J');
      expect(model.nativeId).toBe(1);
    });

    describe('forge & valueOf', () => {
      it('from object', () => {
        const data = { name: 'a name' };
        const model = (new DefaultModel()).forge(data);
        expect(model.valueOf()).not.toBe(data);
        expect(model._.previous).toBe(data);
      });

      it('from model', async () => {
        const model = await DefaultModel.load(1);
        const other = (new DefaultModel()).forge(model);
        expect(other.valueOf()).not.toBe(model.valueOf());
        expect(other._.previous).toBe(model._.previous);
      });
    });

    it('clone', async () => {
      const model = await DefaultModel.load(1);
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
      const model = await DefaultModel.load(1);
      model.merge({ name: 'a name', archive: { items: [20, 40] } });
      expect(model._).toMatchSnapshot();
    });

    it('hash & verify', async () => {
      const model = await DefaultModel.load(1);
      model.set({ password: 'XYZ2020' });
      expect(model.verify('password', 'XYZ2020')).toBe(true);
      expect(model.verify('password', 'XYZ2049')).toBe(false);
    });

    describe('insert of save', () => {
      it('has operator', async () => {
        await (new DefaultModel({ name: 'new is insert' })).save(10);
        await (new DefaultModel()).save(10, { name: 'new is action' });
        expect(client).toMatchSnapshot();

        await expect((new DefaultModel()).save(null, { name: 'new is insert again' }))
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator', async () => {
        await (new NoOperatorModel()).save(null, { name: 'new is no operator insert' });
        expect(client).toMatchSnapshot();
      });
    });

    describe('update of save', async () => {
      it('has operator', async () => {
        const model = await DefaultModel.load(4);

        await model.save(20);

        model.name = 'name is update';
        await model.save(20);

        await model.save(20, { name: 'name is action' });
        expect(client).toMatchSnapshot();

        await expect(model.save(null, { name: 'new is update again' }))
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator', async () => {
        const model = await NoOperatorModel.load(6);
        await model.save(null, { name: 'name is no operator update' });
        expect(client).toMatchSnapshot();
      });
    });

    describe('destroy', () => {
      it('has operator', async () => {
        const model = await DefaultModel.load(4);

        await expect(model.destroy())
          .rejects.toEqual(new Error('operator is required'));

        await model.destroy(10);

        await model.destroy(10);
        expect(client).toMatchSnapshot();
      });

      it('no operator', async () => {
        const model = await NoOperatorModel.load(5);
        await model.destroy();
        expect(client).toMatchSnapshot();
      });

      it('is not soft delete', async () => {
        class DirectDelete extends NoOperatorModel {
          static softDelete = false;
        }
        const model = await DirectDelete.load(6);

        await model.destroy();
        expect(client).toMatchSnapshot();
      });
    });

    it('fetch', async () => {
      const model = new DefaultModel({ name: 'name is one' });
      await model.fetch();
      expect(model.valueOf()).toMatchSnapshot();
      expect(client).toMatchSnapshot();

      await expect((new DefaultModel({ name: 'one' })).fetch())
        .resolves.toEqual(null);
      await expect((new DefaultModel({ name: 'one' })).fetch(NotFoundError))
        .rejects.toEqual(new NotFoundError());
    });

    it('fetch with where', async () => {
      const model = new DefaultModel();
      model.where({ name: 'name is one' });
      await model.fetch();
      expect(model.valueOf()).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    describe('fetchAll', () => {
      it('no cache', async () => {
        const model = new DefaultModel({ name: 'name is one' });
        expect(_.map(await model.fetchAll(), data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();

        await expect((new DefaultModel({ name: 'one' })).fetchAll())
          .resolves.toEqual([]);
        await expect((new DefaultModel({ name: 'one' })).fetchAll(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('cache', async () => {
        const model = new DefaultModel({ name: 'name is one' });
        model.cache = { prime: jest.fn() };
        await model.fetchAll();
        expect(model.cache.prime).toHaveBeenCalledWith(toGlobalId('default_table', 1), expect.anything());
      });
    });

    it('addKeyValue', async () => {
      const model = await DefaultModel.load(1);

      expect(model.valueOf('data')).toBe(null);
      await model.addKeyValue('data', '10', 'xyz');
      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });

      expect(client).toMatchSnapshot();
    });

    it('delKeyValue', async () => {
      const model = await DefaultModel.load(1);

      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });
      await model.delKeyValue('data', '10');
      expect(model.valueOf('data')).toEqual({});

      expect(client).toMatchSnapshot();
    });

    it('search', async () => {
      await (new DefaultModel({ name: 'new for action' })).save('10');
      await (new DefaultModel({ name: 'new for search' })).save('10');
      const model = new DefaultModel();
      model.search('new');
      expect(_.map(await model.fetchAll(), data => data.name)).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });
});
