/* eslint no-underscore-dangle: ["error", { "allow": ["_dataloader", "_columns"] }] */

import _ from 'lodash';
import DataLoader from 'dataloader';
import crypto from 'crypto';
import { isGlobalId, toGlobalId, fromGlobalId } from 'graphql-tower-global-id';
import { PrimaryKeyColumn, DateTimeColumn, ValueColumn } from './columns';

export * from './columns';

export default class Model {
  static database = null;

  static tableName = null;

  static idAttribute = 'id';

  static keywordAttribute = 'keyword';

  static hasOperator = false;

  static hasTimestamps = true;

  static softDelete = true;

  static toKeyword = null;

  static get columns() {
    if (_.isFunction(this._columns)) this.columns = this._columns();
    return this._columns;
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

  static get queryBuilder() {
    return this.database(this.tableName);
  }

  static fromGlobalId(value) {
    return isGlobalId(value) ? fromGlobalId(value, this.tableName) : value;
  }

  static toGlobalId(value) {
    return toGlobalId(this.tableName, value);
  }

  static format(data) {
    return _.mapKeys(data, (value, key) => _.camelCase(key));
  }

  static signify(data) {
    return _.mapKeys(data, (value, key) => _.snakeCase(key));
  }

  static forge(attributes) {
    const model = new this();
    return model.forge(attributes);
  }

  static async loader(ids) {
    const { idAttribute } = this;
    const collections = {};
    const queryBuilder = this.queryBuilder.whereIn(_.snakeCase(idAttribute), ids);
    if (this.softDelete) queryBuilder.whereNull('deleted_at');

    _.forEach(await queryBuilder, (item) => {
      const obj = this.format(item);
      collections[obj[idAttribute]] = obj;
    });

    return _.map(ids, id => (collections[id] || null));
  }

  static load(id, cache, error) {
    if (!id) return null;

    const nativeId = this.fromGlobalId(id);

    const reply = Promise.resolve(nativeId);

    reply.nativeId = nativeId;
    reply.then = (resolve, reject) => Promise.resolve()
      .then(() => {
        if (cache && cache.load) return cache.load(this.toGlobalId(nativeId));

        return this.dataloader.load(nativeId).then(data => (data ? this.forge(data) : null));
      })
      .then((model) => {
        if (!model) {
          const NotFoundError = (cache && cache.prototype) instanceof Error ? cache : error;
          if (NotFoundError) throw new NotFoundError();
        }

        return model;
      })
      .then(resolve, reject);

    return reply;
  }

  static async loadMany(ids, cache, error) {
    return Promise.all(_.map(ids, id => this.load(id, cache, error)));
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

  constructor(attrs) {
    const {
      columns, idAttribute, hasOperator, hasTimestamps, softDelete,
    } = this.constructor;
    const properties = _.mapValues(
      _.defaults(
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
      ),
      (column, name) => {
        if (!column.name) column.name = name; // eslint-disable-line
        return {
          enumerable: column.enumerable,
          set: value => column.set(value, this._.current, this),
          get: () => column.get(this._.current, this),
        };
      },
    );
    Object.defineProperties(this, properties);

    if (attrs) this.set(attrs);
  }

  get isNew() {
    const { idAttribute } = this.constructor;
    return !this[idAttribute];
  }

  get changes() {
    const data = {};
    _.forEach(this.valueOf(), (value, key) => {
      if (_.isObject(value)) {
        if (!_.isEqual(this._.previous[key], value)) data[key] = value;
        return;
      }

      if (value !== this._.previous[key]) data[key] = value;
    });

    return data;
  }

  get queryBuilder() {
    if (!this._.queryBuilder) {
      this._.queryBuilder = this.constructor.queryBuilder;
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
    if (keywordAttribute) delete data[keywordAttribute];

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
    const { idAttribute, toGlobalId: toGid, format } = this.constructor;
    const { cache } = this;

    const collection = _.map(await queryBuilder, format);

    if (cache && cache.prime) {
      _.forEach(collection, obj => cache.prime(toGid(obj[idAttribute]), obj));
    }

    if (collection.length < 1) {
      if (NotFoundError) throw new NotFoundError();
      return [];
    }

    return _.map(collection, this.forge.bind(this));
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
    _.assign(this._.current, values);
    _.assign(this._.previous, values);

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

  prime(id, data) {
    const { toGid } = this.constructor;
    if (this.cache) this.cache.prime(toGid(id), data);

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

    const values = _.assign(_.cloneDeep(this.valueOf()), _.cloneDeep(tmpData));

    if (toKeyword) values[keywordAttribute] = toKeyword(values);

    if (hasOperator) {
      values.createdBy = Model.fromModel(operator);
      values.updatedBy = Model.fromModel(operator);
    }
    if (hasTimestamps) {
      values.createdAt = new Date();
      values.updatedAt = values.createdAt;
    }

    const [id] = await this.constructor.queryBuilder
      .insert(signify(values))
      .returning(_.snakeCase(idAttribute));

    values[idAttribute] = id;

    this.forge(values);
    this.prime(values[idAttribute], values);

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

    const values = _.assign(_.cloneDeep(this.valueOf()), _.cloneDeep(tmpData));

    const keys = _.uniq(_.keys(this.changes), _.keys(tmpData));
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
    const { idAttribute, signify, hasOperator } = this.constructor;
    const id = this.valueOf(idAttribute);
    if (!this.constructor.softDelete) {
      await this.query.delete();

      this.prime(id);
      return this;
    }

    if (hasOperator && !operator) {
      throw new Error('operator is required');
    }

    if (!this.valueOf('deletedAt')) {
      const data = { deletedAt: new Date() };
      if (hasOperator) data.deletedBy = Model.fromModel(operator);
      await this.query.update(signify(data));

      this.merge(data);
    }

    this.prime(id);

    return this;
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
  'orderBy', 'orderByRaw',
], (key) => {
  Model.prototype[key] = function queryBuilder(...args) {
    this.queryBuilder[key](...args);
    return this;
  };
});
