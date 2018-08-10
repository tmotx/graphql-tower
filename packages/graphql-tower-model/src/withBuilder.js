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
    }

    mount(query) {
      const {
        idAttribute, keywordAttribute, signify, softDelete,
      } = this.constructor;

      _.forEach(_.get(this._, ['builderTasks']), ([key, args]) => {
        query[key](...args);
      });
      _.set(this._, ['builderTasks'], []);

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

    get query() {
      const { query } = this.constructor;
      return this.mount(query);
    }

    get mutate() {
      const { mutate } = this.constructor;
      return this.mount(mutate);
    }

    async find() {
      const { database, format } = this.constructor;
      const { query } = this;

      if (_.get(query, ['_single', 'limit']) !== 1) {
        query.select(database.raw('*, count(*) OVER() AS total_count'));
      }

      const collection = _.map(await query, row => format(row));

      const totalCount = _.get(collection[0], ['totalCount'], 0);
      const results = _.map(collection, (data) => {
        _.unset(data, ['totalCount']);
        const model = this.constructor.forge(data);
        return model;
      });
      results.totalCount = parseInt(totalCount, 10);
      results.offset = _.get(query, ['_single', 'offset'], 0);
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

    async destroy() {
      const { mutate } = this;
      return mutate.delete();
    }
  }

  _.forEach([
    'select', 'joinRaw', 'whereRaw', 'orderByRaw', 'offset', 'limit',
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
