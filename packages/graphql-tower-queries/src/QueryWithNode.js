import get from 'lodash/get';
import defaultTo from 'lodash/defaultTo';
import Query from './Query';
import PayloadField from './PayloadField';

export default class QueryWithNode extends Query {
  fieldName = null;

  static async resolve(...args) {
    if (!args[1].id) {
      return null;
    }

    return super.resolve(...args);
  }

  constructor(fieldName) {
    super({
      id: new PayloadField((payload, args, context, info) => (
        get(payload, defaultTo(this.fieldName, `${get(info, 'fieldName')}Id`))
      )),
    });

    this.fieldName = fieldName;
  }
}
