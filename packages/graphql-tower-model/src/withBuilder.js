import _ from 'lodash';

export default (Parent) => {
  class Builder extends Parent {
    static get query() {
      const { tableName, viewName } = this;
      return this.database(viewName || tableName);
    }

    static get mutate() {
      return this.database(this.tableName);
    }

    constructor(...args) {
      super(...args);
      _.set(this._, ['builderTasks'], []);
      _.set(this._, ['offset'], 0);
      _.set(this._, ['limit'], 1000);
    }

    limit(value) {
      if (!_.isNil(value)) {
        this._.limit = value;
        return this;
      }
      return this._.limit;
    }

    offset(value) {
      if (!_.isNil(value)) {
        this._.offset = value;
        return this;
      }
      return this._.offset;
    }

    mount(sql) {
      const {
        idAttribute, keywordAttribute, signify, softDelete,
      } = this.constructor;

      _.forEach(_.get(this._, ['builderTasks']), ([key, args]) => {
        sql[key](...args);
      });
      _.set(this._, ['builderTasks'], []);

      if (softDelete) sql.whereNull('deleted_at');

      const values = this.valueOf();
      const id = values[idAttribute];
      if (id) return sql.where(_.snakeCase(idAttribute), id);

      const data = signify(values);
      delete data[keywordAttribute];

      _.forEach(data, (value, key) => {
        if (!_.isObject(value)) sql.where(key, value);
      });

      return sql;
    }

    get query() {
      const { query } = this.constructor;

      const offset = this.offset();
      const limit = this.limit();
      this.offset(0).limit(1000);

      _.set(query, ['params'], { offset, limit });
      query.offset(offset).limit(limit);

      return this.mount(query);
    }

    get mutate() {
      const { mutate } = this.constructor;
      return this.mount(mutate);
    }

    async find() {
      const { database, format } = this.constructor;
      const { query } = this;
      const { offset, limit } = query.params;

      if (limit !== 1) {
        query.select(database.raw('*, count(*) OVER() AS total_count'));
      }

      const collection = _.map(await query, row => format(row));

      const totalCount = _.get(collection[0], ['totalCount'], 0);
      const results = _.map(collection, (data) => {
        _.unset(data, ['totalCount']);
        const model = this.constructor.forge(data);
        return model;
      });
      _.assign(results, {
        totalCount: parseInt(totalCount, 10), offset, limit,
      });
      return results;
    }

    async insert(values) {
      const { mutate, signify } = this.constructor;
      const [row] = await mutate.insert(signify(values), '*');
      if (!row) throw new Error();

      this.merge(row);
      return this;
    }

    async update(changes) {
      const { signify } = this.constructor;
      const { mutate } = this;
      const [row] = await mutate.update(signify(changes)).returning('*');
      if (!row) throw new Error();

      this.merge(row);
      return this;
    }

    async delete() {
      const { mutate } = this;
      return mutate.delete();
    }
  }

  _.forEach([
    'select', 'joinRaw', 'whereRaw', 'orderByRaw',
  ], (key) => {
    Builder.prototype[key] = function queryBuilderRaw(...args) {
      this._.builderTasks.push([key, args]);
      return this;
    };
  });

  _.forEach([
    'where', 'whereNot', 'orWhere', 'orWhereNot',
    'whereIn', 'whereNotIn', 'orWhereIn', 'orWhereNotIn',
    'whereNull', 'whereNotNull', 'orWhereNull', 'orWhereNotNull',
    'whereExists', 'whereNotExists', 'orWhereExists', 'orWhereNotExists',
    'whereBetween', 'whereNotBetween', 'orWhereBetween', 'orWhereNotBetween',
    'orderBy',
  ], (key) => {
    Builder.prototype[key] = function queryBuilder(column, ...args) {
      this._.builderTasks.push([key, [this.constructor.signify(column), ...args]]);
      return this;
    };
  });

  return Builder;
};
