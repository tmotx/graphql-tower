/* eslint no-underscore-dangle: ["error", { "allow": ["_dataloader", "_columns"] }] */

import _ from 'lodash';
import DataLoader from 'dataloader';
import crypto from 'crypto';
import { combine } from 'graphql-tower-helper';
import { isGlobalId, toGlobalId, fromGlobalId } from 'graphql-tower-global-id';
import { PrimaryKeyColumn, DateTimeColumn, ValueColumn } from './columns';

_.unionKeys = collections => _.union(..._.map(collections, _.keys));
_.cloneAndMerge = collections => _.assign(..._.map(collections, _.cloneDeep));

export * from './columns';

export default class Model {
  static database = null;

  static tableName = null;

  static idAttribute = 'id';

  static keywordAttribute = 'keyword';

  static hasUUID = false;

  static hasOperator = false;

  static hasTimestamps = true;

  static softDelete = true;

  static toKeyword = null;

  static get displayName() {
    return this.name;
  }

  static get columns() {
    if (_.isFunction(this._columns)) this.columns = this._columns();

    const {
      idAttribute, hasOperator, hasTimestamps, softDelete,
    } = this;

    return _.defaults(
      this._columns,
      _.set({}, idAttribute, new PrimaryKeyColumn()),
      hasTimestamps && {
        createdAt: new DateTimeColumn(),
        updatedAt: new DateTimeColumn(),
      }, softDelete && {
        deletedAt: new DateTimeColumn(),
      }, hasOperator && hasTimestamps && {
        createdBy: new ValueColumn(),
        updatedBy: new ValueColumn(),
      }, hasOperator && softDelete && {
        deletedBy: new ValueColumn(),
      },
    );
  }

  static set columns(columns) {
    this._columns = columns;
  }

  static get dataloader() {
    if (!this._dataloader) {
      this._dataloader = new DataLoader(this.loader.bind(this), { cache: false });
    }

    return this._dataloader;
  }

  static get query() {
    return this.database(this.tableName);
  }

  static fromGlobalId(value) {
    const id = isGlobalId(value) ? fromGlobalId(value, this.displayName) : value;
    if (this.hasUUID && !Model.isUUID(id)) throw new TypeError();
    return id;
  }

  static toGlobalId(value) {
    return toGlobalId(this.displayName, value);
  }

  static format(data) {
    return _.mapKeys(data, (value, key) => _.camelCase(key));
  }

  static signify(data) {
    return _.mapKeys(data, (value, key) => _.snakeCase(key));
  }

  static forge(attributes, options) {
    const model = new this({}, options);
    return model.forge(attributes);
  }

  static batchInsert(rows, chunkSize) {
    return this.database
      .batchInsert(this.tableName, rows, chunkSize)
      .returning(_.snakeCase(this.idAttribute));
  }

  static async loader(ids) {
    const { idAttribute, query } = this;
    const collections = {};

    query.whereIn(_.snakeCase(idAttribute), ids);
    if (this.softDelete) query.whereNull('deleted_at');

    _.forEach(await query, (item) => {
      const obj = this.format(item);
      collections[obj[idAttribute]] = obj;
    });

    return _.map(ids, id => (collections[id] || null));
  }

  static load(id, error, cache) {
    if (!id) return null;

    const nativeId = this.fromGlobalId(id, this.displayName);

    return combine(() => Promise
      .resolve()
      .then(() => {
        const Cache = cache || error;
        if (Cache && Cache.load) return Cache.load(this.toGlobalId(nativeId));

        return this.dataloader.load(nativeId).then(data => (data ? this.forge(data) : null));
      })
      .then((model) => {
        const NotFoundError = error;
        if (!model && NotFoundError && (NotFoundError.prototype instanceof Error || NotFoundError.name === 'Error')) {
          throw new NotFoundError();
        }

        return model;
      }), { nativeId }).promise;
  }

  static async loadMany(ids, error, cache) {
    return Promise.all(_.map(ids, id => this.load(id, error, cache)));
  }

  static verifyHash(raw, value) {
    try {
      const [salt, hash] = _.split(raw, ':', 2);

      if (crypto
        .pbkdf2Sync(value, Buffer.from(salt, 'hex'), 8727, 512, 'sha512')
        .toString('hex') !== hash) throw new Error();

      return true;
    } catch (error) {
      return false;
    }
  }

  static isUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  }

  _ = {
    current: {},
    previous: {},
    queryBuilder: undefined,
  }

  static fromModel(model) {
    return model ? model.nativeId || model : null;
  }

  cache = null;

  constructor(attrs, options) {
    const { columns } = this.constructor;

    const properties = _.mapValues(columns, (column, name) => {
      if (!column.name) column.name = name; // eslint-disable-line
      return {
        enumerable: column.enumerable,
        set: value => column.set(value, this._.current, this),
        get: () => column.get(this._.current, this),
      };
    });
    Object.defineProperties(this, properties);

    if (attrs) this.set(attrs);
    if (options && options.cache) this.cache = options.cache;
  }

  get isNew() {
    const { idAttribute } = this.constructor;
    return !this[idAttribute];
  }

  get changes() {
    const data = _.omitBy(
      this.valueOf(),
      (value, key) => _.isEqual(this._.previous[key], value),
    );

    return data;
  }

  get queryBuilder() {
    if (!this._.queryBuilder) {
      this._.queryBuilder = this.constructor.query;
    }
    return this._.queryBuilder;
  }

  get query() {
    const {
      idAttribute, signify, keywordAttribute, softDelete,
    } = this.constructor;
    const query = this.queryBuilder;

    delete this._.queryBuilder;

    if (softDelete) query.whereNull('deleted_at');

    const values = this.valueOf();
    const id = values[idAttribute];
    if (id) return query.where(_.snakeCase(idAttribute), id);

    const data = signify(values);
    delete data[keywordAttribute];

    _.forEach(data, (value, key) => {
      if (!_.isObject(value)) query.where(key, value);
    });

    return query;
  }

  get nativeId() {
    const { idAttribute } = this.constructor;
    return this.valueOf(idAttribute);
  }

  async loadQuery(queryBuilder, NotFoundError) {
    const { format } = this.constructor;
    const { cache } = this;

    const collection = _.map(await queryBuilder, format.bind(this.constructor));

    if (collection.length < 1) {
      if (NotFoundError) throw new NotFoundError();
      return [];
    }

    return _.map(collection, (data) => {
      const model = this.constructor.forge(data, { cache });
      model.prime();
      return model;
    });
  }

  clone(options) {
    const model = new this.constructor({}, options);
    return model.forge(this);
  }

  forge(attributes) {
    if (attributes._) {
      this._.current = _.cloneDeep(attributes._.current);
      this._.previous = attributes._.previous;
      return this;
    }

    delete attributes.rank; // eslint-disable-line
    this._.current = _.cloneDeep(attributes);
    this._.previous = attributes;
    return this;
  }

  valueOf(name) {
    if (name) return this._.current[name];
    return this._.current;
  }

  merge(values) {
    const handler = _.isPlainObject(values) ? data => _.assign(data, values) : values;
    _.forEach([this._.current, this._.previous], handler);

    return this;
  }

  set(data) {
    _.forEach(data, (value, key) => { this[key] = value; });
    return this;
  }

  verify(columnName, value) {
    const raw = this[columnName];
    return this.constructor.verifyHash(raw, value);
  }

  prime() {
    if (this.cache && this.id) this.cache.prime(this.id, this);
    return this;
  }

  clear() {
    if (this.cache && this.id) this.cache.clear(this.id);
    return this;
  }

  async fetch(NotFoundError) {
    const data = await this.loadQuery(
      this.query.limit(1),
      NotFoundError,
    );

    if (!data[0]) return null;

    this.forge(data[0]);
    return this;
  }

  async fetchAll(NotFoundError) {
    const data = await this.loadQuery(
      this.query.limit(1000),
      NotFoundError,
    );

    return data;
  }

  async insert(operator, tmpData) {
    const {
      idAttribute,
      signify,
      keywordAttribute,
      toKeyword,
      hasOperator,
      hasTimestamps,
    } = this.constructor;

    if (hasOperator && !operator) {
      throw new Error('operator is required');
    }

    const values = _.cloneAndMerge([this.valueOf(), tmpData]);

    if (toKeyword) values[keywordAttribute] = toKeyword(values);

    if (hasOperator) {
      values.createdBy = Model.fromModel(operator);
      values.updatedBy = Model.fromModel(operator);
    }
    if (hasTimestamps) {
      values.createdAt = new Date();
      values.updatedAt = values.createdAt;
    }

    const [id] = await this.constructor.query
      .insert(signify(values))
      .returning(_.snakeCase(idAttribute));

    values[idAttribute] = id;

    this.forge(values);
    this.prime();

    return this;
  }

  async update(operator, tmpData) {
    const {
      signify,
      keywordAttribute,
      toKeyword,
      hasOperator,
      hasTimestamps,
    } = this.constructor;

    if (hasOperator && !operator) {
      throw new Error('operator is required');
    }

    const values = _.cloneAndMerge([this.valueOf(), tmpData]);

    const keys = _.unionKeys([this.changes, tmpData]);
    if (_.size(keys) < 1) return this;

    if (toKeyword) values[keywordAttribute] = toKeyword(values);
    if (hasOperator) values.updatedBy = Model.fromModel(operator);
    if (hasTimestamps) values.updatedAt = new Date();

    const changes = _.pick(values, _.concat(['updatedBy', 'updatedAt', keywordAttribute], keys));
    await this.query.update(signify(changes));

    this.merge(changes);

    return this;
  }

  async save(operator, tmpData) {
    if (this.isNew) {
      return this.insert(operator, tmpData);
    }

    return this.update(operator, tmpData);
  }

  async destroy(operator) {
    const { signify, hasOperator, softDelete } = this.constructor;
    return Promise.resolve()
      .then(() => {
        if (!softDelete) return this.query.delete();

        if (hasOperator && !operator) {
          throw new Error('operator is required');
        }

        if (!this.valueOf('deletedAt')) {
          const data = { deletedAt: new Date() };
          if (hasOperator) data.deletedBy = Model.fromModel(operator);
          this.merge(data);

          return this.query.update(signify(data));
        }

        return this;
      })
      .then(() => {
        this.clear();
        return this;
      });
  }

  async addKeyValue(column, key, value) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const item = _.set({}, key, value);
    const setValue = _.set({}, snake, database.raw(`coalesce(${snake}, '{}') || ?`, [item]));
    await this.query.update(setValue);

    this.merge(data => _.setWith(data, [_.camelCase(column), key], value, Object));
  }

  async delKeyValue(column, key) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const setValue = _.set({}, snake, database.raw(`coalesce(${snake}, '{}') - ?`, [key]));
    await this.query.update(setValue);

    this.merge(data => _.unset(data, [_.camelCase(column), key]));
  }

  async appendValue(column, value) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const setValue = _.set({}, snake, database.raw(`array_append(array_remove(${snake}, ?), ?)`, [value, value]));
    await this.query.update(setValue);

    this.merge(_.set({}, column, _.concat(_.pull(this.valueOf(column) || [], value), value)));
  }

  async removeValue(column, value) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const setValue = _.set({}, snake, database.raw(`array_remove(${snake}, ?)`, [value]));
    await this.query.update(setValue);

    this.merge(_.set({}, column, _.pull(this.valueOf(column) || [], value)));
  }

  search(keyword) {
    const { database, keywordAttribute } = this.constructor;
    const { queryBuilder } = this;
    queryBuilder.select(database.raw(`*, ts_rank(${keywordAttribute}, ?) as rank`, keyword));
    queryBuilder.where(database.raw(`${keywordAttribute} @@ to_tsquery(?)`, keyword));
    queryBuilder.orderBy('rank', 'desc');
    return this;
  }
}

_.forEach([
  'where', 'whereNot', 'whereIn', 'whereNotIn', 'whereNull', 'whereNotNull', 'whereExists',
  'whereNotExists', 'whereBetween', 'whereNotBetween', 'whereRaw',
  'orderBy', 'orderByRaw', 'increment', 'decrement',
], (key) => {
  Model.prototype[key] = function queryBuilder(...args) {
    this.queryBuilder[key](...args);
    return this;
  };
});
