/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import DataLoader from 'dataloader';
import { assertResult } from 'graphql-tower-helper';
import { fromGlobalId } from 'graphql-tower-global-id';

export default class DataCache {
  static async loader(ids) {
    return Promise.all(_.map(ids, async (id) => {
      const gid = fromGlobalId(id);
      const Model = this[gid.type];
      if (!Model) return null;

      return Model.load(gid.toString());
    }));
  }

  static get(target, name) {
    if (target[name]) return target[name];

    const loader = /^load(.+)$/ig.exec(name);
    if (loader) return (...args) => target.load(...args, loader[1]);

    const ClassName = _.upperFirst(name);
    if (target.constructor[ClassName]) return target.create(ClassName);

    return undefined;
  }

  static set(target, name, value) {
    target[name] = value;
  }

  dataloader = null;

  constructor() {
    const { loader } = this.constructor;

    this.dataloader = new DataLoader(
      loader.bind(this.constructor),
      { cacheMap: new Map() },
    );

    return new Proxy(this, {
      get: DataCache.get,
      set: DataCache.set,
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
      .then(model => assertResult(model, error));
  }

  async loadMany(ids, error, type) {
    return Promise.all(_.map(ids, id => this.load(id, error, type)));
  }

  create(name) {
    const Model = this.constructor[name];
    const model = new Model({}, { cache: this });
    return model;
  }

  prime(id, newModel) {
    const { dataloader } = this;

    const gid = fromGlobalId(id);
    if (!this.constructor[gid.type]) return this;

    dataloader.clear(id);
    if (newModel) {
      dataloader.prime(id, newModel);
      _.set(newModel, 'cache', this);
    }

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
