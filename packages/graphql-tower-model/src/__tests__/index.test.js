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
    it('columns', () => {
      expect(DefaultModel.columns).toMatchSnapshot();
    });

    it('dataloader', () => {
      expect(DefaultModel.dataloader).toMatchSnapshot();
    });

    it('queryBuilder', () => {
      expect(DefaultModel.queryBuilder.toString()).toBe('select * from "default_table"');
    });

    it('toGlobalId & fromGlobalId', () => {
      expect(DefaultModel.toGlobalId('2020')).toBe('iN3wDu0PJew8f0Jmr3hvaGDUPVMrPibs');
      expect(DefaultModel.fromGlobalId('iN3wDu0PJew8f0Jmr3hvaGDUPVMrPibs')).toBe('2020');

      expect(() => DefaultModel.fromGlobalId(toGlobalId('type', '2020'))).toThrowErrorMatchingSnapshot();
      expect(fromGlobalId(DefaultModel.toGlobalId('2020')).type).toBe('default_table');
    });

    it('format && signify', () => {
      expect(DefaultModel.format({ is_admin: true })).toEqual({ isAdmin: true });
      expect(DefaultModel.signify({ isAdmin: true })).toEqual({ is_admin: true });
    });

    it('forge', () => {
      expect(DefaultModel.forge({ name: 'my name' })).toMatchSnapshot();
    });

    it('load && loadMany', async () => {
      expect(await DefaultModel.load(1)).toEqual(expect.objectContaining({ name: 'name is one' }));

      const results = await Promise.all([DefaultModel.load(1), DefaultModel.loadMany([1, 2])]);
      expect(results).toEqual([
        expect.objectContaining({ name: 'name is one' }),
        [expect.objectContaining({ name: 'name is one' }), expect.objectContaining({ name: 'name is two' })],
      ]);

      expect(client).toMatchSnapshot();

      await expect(DefaultModel.load(99)).resolves.toEqual(null);
      await expect(DefaultModel.load(99, NotFoundError)).rejects.toEqual(new NotFoundError());
      await expect(DefaultModel.loadMany([99])).resolves.toEqual([null]);
      await expect(DefaultModel.loadMany([99], NotFoundError)).rejects.toEqual(new NotFoundError());
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

    it('insert of save', async () => {
      await (new DefaultModel({ name: 'new is three' })).save(10);
      await (new DefaultModel()).save(10, { name: 'new is four' });
      expect(client).toMatchSnapshot();
    });

    it('update of save', async () => {
      const model = await DefaultModel.load(3);
      await model.save(20, { name: 'name is four part2' });
      expect(client).toMatchSnapshot();
    });

    it('destroy', async () => {
      const model = await DefaultModel.load(3);
      await model.destroy(10);
      expect(client).toMatchSnapshot();
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

    it('fetchAll', async () => {
      const model = new DefaultModel({ name: 'name is one' });
      expect(_.map(await model.fetchAll(), data => data.name)).toMatchSnapshot();
      expect(client).toMatchSnapshot();

      await expect((new DefaultModel({ name: 'one' })).fetchAll())
        .resolves.toEqual([]);
      await expect((new DefaultModel({ name: 'one' })).fetchAll(NotFoundError))
        .rejects.toEqual(new NotFoundError());
    });

    it('search', async () => {
      await (new DefaultModel({ name: 'new for search' })).save('10');
      const model = new DefaultModel();
      model.search('new');
      expect(_.map(await model.fetchAll(), data => data.name)).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });
});
