import _ from 'lodash';
import DataLoader from 'dataloader';
import { fromGlobalId } from 'graphql-tower-global-id';
import TimeToLiveStore from './TimeToLiveStore';

export default class CacheModel {
  static ttl = false;

  static async loader(ids) {
    return Promise.all(_.map(ids, async (id) => {
      const gid = fromGlobalId(id);
      const Model = this[gid.type];
      if (!Model) return null;

      return Model.load(gid.toString());
    }));
  }

  dataloader = null;

  constructor() {
    const { ttl, loader } = this.constructor;
    this.dataloader = new DataLoader(loader.bind(this.constructor), {
      cacheMap: ttl ? new TimeToLiveStore() : new Map(),
    });

    _.forEach(_.pullAll(_.keys(this.constructor), _.keys(CacheModel)), (name) => {
      Object.defineProperty(this, name, {
        enumerable: true,
        get: () => {
          const Model = this.constructor[name];
          const model = new Model({}, { cache: this });
          return model;
        },
      });
    });
  }

  async load(id, type, error) {
    return Promise.resolve()
      .then(async () => {
        const model = await this.dataloader.load(id);
        if (!model) return null;

        if (type && typeof type === 'string' && model.constructor.tableName !== type) return null;
        return model.clone({ cache: this });
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

  prime(id, newModel) {
    const { dataloader } = this;

    const gid = fromGlobalId(id);
    if (!this.constructor[gid.type]) return this;

    dataloader.clear(id);
    if (newModel) dataloader.prime(id, newModel);

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
