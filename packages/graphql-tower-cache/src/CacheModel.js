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
      Object.defineProperty(this, _.lowerFirst(name), {
        enumerable: true,
        get: () => {
          const Model = this.constructor[name];
          const model = new Model({}, { cache: this });
          return model;
        },
      });
      this[`load${_.upperFirst(name)}`] = (...args) => this.load(...args, name);
    });
  }

  async load(id, error, type) {
    return Promise.resolve()
      .then(async () => {
        const model = await this.dataloader.load(id);
        if (!model) return null;

        const Type = type || error;
        if ((Type && typeof Type === 'string') && model.constructor.displayName !== Type) return null;
        return model.clone({ cache: this });
      })
      .then(async (model) => {
        const NotFoundError = error;
        if (!model && NotFoundError && (NotFoundError.prototype instanceof Error || NotFoundError.name === 'Error')) {
          throw new NotFoundError();
        }

        return model;
      });
  }

  async loadMany(ids, error, type) {
    return Promise.all(_.map(ids, id => this.load(id, error, type)));
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
