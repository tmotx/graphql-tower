import _ from 'lodash';
import { fromGlobalId } from 'graphql-tower-global-id';

export default class MixedModel {
  static load(id, error, cache) {
    if (!id) return null;

    const gid = fromGlobalId(id);
    const Model = this[gid.type];
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
