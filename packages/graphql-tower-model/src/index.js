/* eslint no-underscore-dangle: ["error", { "allow": ["_dataloader", "_columns", "__columns"] }] */

import _ from 'lodash';
import fp from 'lodash/fp';
import DataLoader from 'dataloader';
import crypto from 'crypto';
import { thunk, combine, assertResult, batch } from 'graphql-tower-helper';
import { isGlobalId, toGlobalId, fromGlobalId } from 'graphql-tower-global-id';
import { PrimaryKeyColumn, DateTimeColumn, ValueColumn } from './columns';

const unionKeys = fp.compose(fp.flatten, fp.map(fp.keys));

export * from './columns';
export { default as MixedModel } from './MixedModel';

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

  static _columns = thunk({});

  static get displayName() {
    return this.name;
  }

  static get columns() {
    if (this.__columns) return this.__columns;

    const columns = this._columns();

    const {
      idAttribute, hasOperator, hasTimestamps, softDelete,
    } = this;

    this.__columns = _.defaults(
      columns,
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

    return this.__columns;
  }

  static set columns(columns) { this._columns = thunk(columns); }

  static get dataloader() {
    if (!this._dataloader) {
      this._dataloader = new DataLoader(this.loader.bind(this), { cache: false });
    }

    return this._dataloader;
  }

  static get query() {
    return this.database(this.tableName);
  }

  static raw(...args) {
    return this.database.raw(...args);
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

  static signify(column) {
    if (_.isPlainObject(column)) {
      return _.mapKeys(column, (value, key) => _.snakeCase(key));
    }
    if (_.isArray(column)) return _.map(column, _.snakeCase);
    if (_.isString(column)) return _.snakeCase(column);
    return column;
  }

  static forge(attributes, options) {
    const model = new this({}, options);
    return model.forge(attributes);
  }

  static async batchInsert(data, operator) {
    const { hasTimestamps, hasOperator } = this;

    let rows = data;

    if (hasOperator && !operator) {
      throw new Error('operator is required');
    }

    if (hasOperator) {
      const by = Model.fromModel(operator);
      rows = _.map(rows, row => ({ ...row, created_by: by, updated_by: by }));
    }

    if (hasTimestamps) {
      const at = new Date();
      rows = _.map(rows, row => ({ ...row, created_at: at, updated_at: at }));
    }

    return this.database
      .batchInsert(this.tableName, rows)
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
      .then(model => assertResult(model, error)), { nativeId }).promise;
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

  static async batchDestroy(keys) {
    const { signify, hasOperator, softDelete } = this;
    const idAttribute = _.snakeCase(this.idAttribute);

    if (!softDelete) {
      await this.query.whereIn(idAttribute, _.map(keys, ({ id }) => id)).delete();
      return [];
    }

    const operators = {};
    _.forEach(keys, ({ id, operator }) => {
      if (!operators[operator]) operators[operator] = [];
      operators[operator].push(id);
    });

    const results = _.mapKeys(await Promise.all(_.map(operators, async (ids, operator) => {
      const data = { deletedAt: new Date() };
      if (hasOperator) data.deletedBy = Model.fromModel(operator);
      await this.query.whereNull('deleted_at').whereIn(idAttribute, ids).update(signify(data));
      return { operator, data };
    })), ({ operator }) => operator);

    return _.map(keys, ({ operator }) => results[operator].data);
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
    const { columns, batchDestroy } = this.constructor;

    const properties = _.mapValues(columns, (column, name) => {
      if (!column.name) column.name = name; // eslint-disable-line
      return {
        enumerable: column.enumerable,
        set: value => column.set(value, this._.current, this),
        get: () => column.get(this._.current, this),
      };
    });
    Object.defineProperties(this, properties);

    if (!this.constructor.destroy) {
      this.constructor.destroy = batch(batchDestroy.bind(this.constructor));
    }

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

  async loadQuery(query, NotFoundError) {
    const { format, database } = this.constructor;
    const { cache } = this;

    if (_.get(query, ['_single', 'limit']) !== 1) {
      query.select(database.raw('*, count(*) OVER() AS total_count'));
    }
    const collection = _.map(await query, format.bind(this.constructor));

    if (collection.length < 1) {
      if (NotFoundError) throw new NotFoundError();
      return [];
    }

    const { totalCount } = collection[0];
    const results = _.map(collection, (data) => {
      _.unset(data, ['totalCount']);
      const model = this.constructor.forge(data, { cache });
      model.prime();
      return model;
    });

    results.totalCount = parseInt(totalCount, 10);
    results.offset = _.get(query, ['_single', 'offset'], 0);
    return results;
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

  merge(row) {
    const { format } = this.constructor;
    const values = format(row);
    _.forEach([this._.current, this._.previous], data => _.assign(data, values));

    return this;
  }

  set(data) {
    const { columns } = this.constructor;
    _.forEach(data, (value, key) => {
      if (columns[key] && value !== undefined) this[key] = value;
    });
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

  async fetchOrInsert(operator, tempData) {
    return await this.fetch() || this.insert(operator, tempData);
  }

  async fetchAll(NotFoundError) {
    const { query } = this;
    if (_.get(query, ['_single', 'limit']) === undefined) {
      query.limit(1000);
    }

    const data = await this.loadQuery(query, NotFoundError);

    return data;
  }

  async fetchPage({ offset, first } = {}, NotFoundError) {
    if (offset) this.offset(offset);
    if (first) this.limit(first);
    return this.fetchAll(NotFoundError);
  }

  async fetchCount(NotFoundError) {
    const results = await this.query.count('*');
    const count = parseInt(results[0].count, 10);
    assertResult(count, NotFoundError);
    return count;
  }

  async insert(operator, tmpData) {
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

    const values = { ...this.valueOf(), ...tmpData };

    if (toKeyword) values[keywordAttribute] = toKeyword(values);

    if (hasOperator) {
      values.createdBy = Model.fromModel(operator);
      values.updatedBy = Model.fromModel(operator);
    }
    if (hasTimestamps) {
      values.createdAt = new Date();
      values.updatedAt = values.createdAt;
    }

    const [row] = await this.constructor.query.insert(signify(values), '*');

    this.merge(row);
    this.prime();

    return this;
  }

  async updateWithMerge(changes) {
    const { signify } = this.constructor;
    const [row] = await this.query.update(signify(changes)).returning('*');
    this.merge(row);
    return this;
  }

  async update(operator, tmpData) {
    const {
      keywordAttribute,
      toKeyword,
      hasOperator,
      hasTimestamps,
    } = this.constructor;

    if (hasOperator && !operator) {
      throw new Error('operator is required');
    }

    const values = { ...this.valueOf(), ...tmpData };

    const keys = unionKeys([this.changes, tmpData]);
    if (_.size(keys) < 1) return this;

    if (toKeyword) values[keywordAttribute] = toKeyword(values);
    if (hasOperator) values.updatedBy = Model.fromModel(operator);
    if (hasTimestamps) values.updatedAt = new Date();

    const changes = _.pick(values, _.concat(['updatedBy', 'updatedAt', keywordAttribute], keys));

    return this.updateWithMerge(changes);
  }

  async save(operator, tmpData) {
    if (this.isNew) {
      return this.insert(operator, tmpData);
    }

    return this.update(operator, tmpData);
  }

  async destroy(operator) {
    const { hasOperator, destroy } = this.constructor;
    const operatorId = Model.fromModel(operator);

    if (hasOperator && !operatorId) {
      throw new Error('operator is required');
    }

    const data = await destroy({ id: this.nativeId, operator: operatorId || 0 });
    if (data) this.merge(data);

    this.clear();

    return this;
  }

  async addKeyValue(column, key, value) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const item = _.set({}, key, value);
    const changes = _.set({}, snake, database.raw(`coalesce(${snake}, '{}') || ?`, [item]));
    return this.updateWithMerge(changes);
  }

  async delKeyValue(column, key) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const changes = _.set({}, snake, database.raw(`coalesce(${snake}, '{}') - ?`, [key]));
    return this.updateWithMerge(changes);
  }

  async appendValue(column, value) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const changes = _.set({}, snake, database.raw(`array_append(array_remove(${snake}, ?), ?)`, [value, value]));
    return this.updateWithMerge(changes);
  }

  async removeValue(column, value) {
    const { database } = this.constructor;

    const snake = _.snakeCase(column);
    const changes = _.set({}, snake, database.raw(`array_remove(${snake}, ?)`, [value]));
    return this.updateWithMerge(changes);
  }

  async increment(key, difference) {
    const { database, signify } = this.constructor;
    const values = signify(_.mapValues(
      _.isPlainObject(key) ? key : _.set({}, [key], difference),
      _.toNumber,
    ));

    const changes = _.mapValues(values, (value, column) => database.raw(`${column} + ?`, [value]));
    return this.updateWithMerge(changes);
  }

  search(keyword) {
    const { database, keywordAttribute } = this.constructor;
    const { queryBuilder } = this;
    queryBuilder.select(database.raw(`ts_rank(${keywordAttribute}, ?) as rank`, keyword));
    queryBuilder.where(database.raw(`${keywordAttribute} @@ to_tsquery(?)`, keyword));
    queryBuilder.orderBy('rank', 'desc');
    return this;
  }
}

_.forEach([
  'where', 'whereNot', 'orWhere', 'orWhereNot',
  'whereIn', 'whereNotIn', 'orWhereIn', 'orWhereNotIn',
  'whereNull', 'whereNotNull', 'orWhereNull', 'orWhereNotNull',
  'whereExists', 'whereNotExists', 'orWhereExists', 'orWhereNotExists',
  'whereBetween', 'whereNotBetween', 'orWhereBetween', 'orWhereNotBetween',
  'orderBy',
], (key) => {
  Model.prototype[key] = function queryBuilder(column, ...args) {
    this.queryBuilder[key](this.constructor.signify(column), ...args);
    return this;
  };
});

_.forEach([
  'whereRaw', 'orderByRaw', 'offset', 'limit',
], (key) => {
  Model.prototype[key] = function queryBuilderRaw(...args) {
    this.queryBuilder[key](...args);
    return this;
  };
});
