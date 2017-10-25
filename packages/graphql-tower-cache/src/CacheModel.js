import _ from 'lodash';
import DataLoader from 'dataloader';
import { fromGlobalId } from 'graphql-tower-global-id';
import TimeToLiveStore from './TimeToLiveStore';

export default class CacheModel {

  static ttl = false;

  static async loader(ids) {
    return Promise.all(_.map(ids, async (id) => {
      const gid = fromGlobalId(id);
      const model = this[gid.type];
      if (!model) return null;

      const data = await model.dataloader.load(gid.toString());
      return data ? { data, model } : null;
    }));
  }

  dataloader = null;

  constructor() {
    const { ttl, loader } = this.constructor;
    this.dataloader = new DataLoader(loader.bind(this), {
      cacheMap: ttl ? new TimeToLiveStore() : new Map(),
    });
  }

  async load(id, type, error) {
    return Promise.resolve()
      .then(async () => {
        const store = await this.dataloader.load(id);
        if (!store) return null;

        if (type && store.model.tableName !== type) return null;

        const model = store.model.forge(store.data);
        model.cache = this;
        return model;
      })
      .then(async (model) => {
        if (!model) {
          const NotFoundError = (type && type.prototype) instanceof Error ? type : error;
          if (NotFoundError) throw new NotFoundError();
        }

        return model;
      });
  }

  async loadMany(ids, type, error) {
    return Promise.all(_.map(ids, id => this.load(id, type, error)));
  }

  prime(id, data) {
    const { dataloader } = this;

    const gid = fromGlobalId(id);
    const model = this[gid.type];

    if (!model) return this;

    dataloader.clear(id);
    if (data) dataloader.prime(id, { model, data });

    return this;
  }

  clear(id) {
    this.dataloader.clear(id);
    return this;
  }

  clearAll() {
    this.dataloader.clearAll();
    return this;
  }
}
