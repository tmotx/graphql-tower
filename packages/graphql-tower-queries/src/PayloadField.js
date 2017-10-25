import isFunction from 'lodash/isFunction';
import defaultTo from 'lodash/defaultTo';
import get from 'lodash/get';

export default class PayloadField {
  constructor(fieldName) {
    if (isFunction(fieldName)) {
      this.resolveValue = fieldName;
      return;
    }
    this.fieldName = fieldName;
  }

  resolveValue(payload, args, context, info, key) {
    return get(payload, defaultTo(this.fieldName, key));
  }
}
