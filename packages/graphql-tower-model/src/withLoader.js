/* eslint no-underscore-dangle: ["error", { "allow": ["_dataloader"] }] */

import _ from 'lodash';
import DataLoader from 'dataloader';
import { assertResult } from 'graphql-tower-helper';

export default Parent => class Loader extends Parent {
  static get dataloader() {
    let loader = _.get(this, ['_dataloader', this.displayName]);

    if (!loader) {
      loader = new DataLoader(this.loader.bind(this), { cache: false });
      _.set(this, ['_dataloader', this.displayName], loader);
    }

    return loader;
  }

  static async loader(ids) {
    const { idAttribute, softDelete, query } = this;
    const collections = {};

    query.whereIn(this.signify(idAttribute), ids);
    if (softDelete) query.whereNull('deleted_at');

    _.forEach(await query, (item) => {
      const obj = this.format(item);
      collections[obj[idAttribute]] = obj;
    });

    return _.map(ids, id => (collections[id] || null));
  }

  static load(id, error) {
    const promise = Promise.resolve();
    const nativeId = this.fromGlobalId(id);

    Object.assign(promise, {
      nativeId,
      then: (...args) => Promise.resolve()
        .then(() => {
          if (!nativeId) return null;
          return this
            .dataloader
            .load(nativeId)
            .then(data => (data ? this.forge(data) : null));
        })
        .then(model => assertResult(model, error))
        .then(...args),
    });

    return promise;
  }

  static async loadMany(ids, error) {
    return Promise.all(_.map(ids, id => this.load(id, error)));
  }
};
