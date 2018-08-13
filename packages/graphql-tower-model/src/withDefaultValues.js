/* eslint no-underscore-dangle: ["error", { "allow": ["_defaultValues"] }] */

import _ from 'lodash';
import { thunk } from 'graphql-tower-helper';

export default Parent => class DefaultValues extends Parent {
  static set defaultValues(values) {
    this._defaultValues = thunk(values);
  }

  async save(...args) {
    const { _defaultValues } = this.constructor;
    if (this.isNew && _defaultValues) {
      const values = _defaultValues(this.valueOf());
      _.forEach(values, (value, name) => {
        if (_.isNil(this[name])) this[name] = value;
      });
    }

    return super.save(...args);
  }
};
