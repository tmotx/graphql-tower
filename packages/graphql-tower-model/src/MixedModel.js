/* eslint no-underscore-dangle: ["error", { "allow": ["_models", "__models"] }] */
import _ from 'lodash';
import { thunk } from 'thelper';
import { fromGlobalId } from 'graphql-tower-global-id';

export default class MixedModel {
  static _models = thunk([]);

  static get models() {
    if (this.__models) return this.__models;

    this.__models = _.mapKeys(this._models(), model => model.displayName);
    return this.__models;
  }

  static set models(models) { this._models = thunk(models); }

  static load(id, error, cache) {
    if (!id) return null;

    const gid = fromGlobalId(id);
    const Model = this.models[gid.type];
    if (!Model) return null;

    return Model.load(gid.toString(), error, cache);
  }

  static async loadMany(ids, error, cache) {
    return Promise.all(_.map(ids, id => this.load(id, error, cache)));
  }

  static fromModel(model) {
    return model ? model.id || model : null;
  }
}
