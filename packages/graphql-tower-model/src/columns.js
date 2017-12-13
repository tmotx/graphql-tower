import _ from 'lodash';
import crypto from 'crypto';
import { GoneDataError } from 'graphql-tower-errors';

function isType(method) {
  const keyword = /^function ([A-Z][a-z]+)/.exec(method);
  return keyword && ['String', 'Boolean', 'Number'].indexOf(keyword[1]) > -1;
}

export class ValueColumn {
  enumerable = true;

  set name(value) {
    this._.name = value;
  }

  get name() {
    return this._.name;
  }

  set serialize(value) {
    this._.serialize = value;
  }

  get serialize() {
    return (this._.serialize.load || this._.serialize).bind(this._.serialize);
  }

  get isModel() {
    return Boolean(this._.serialize && this._.serialize.fromModel);
  }

  constructor(serialize = String, name) {
    this._ = {};
    this.name = name;
    this.serialize = serialize;
  }

  fromModel(value) {
    if (value === null || value === undefined) return null;

    if (this.isModel) return this._.serialize.fromModel(value);

    return this.serialize(value);
  }

  toModel(value, { cache }) {
    if (value === null || value === undefined) return null;
    return this.serialize(value, GoneDataError, cache);
  }

  set(value, data) {
    _.set(data, this._.name, this.fromModel(value));
  }

  get(data, model) {
    return this.toModel(data[this._.name], model);
  }
}

export class HashColumn extends ValueColumn {
  set(value, ...args) {
    if (value === null || value === undefined) {
      super.set(null, ...args);
      return;
    }

    const salt = crypto.randomBytes(8);
    const password = crypto.pbkdf2Sync(value, salt, 8727, 512, 'sha512');
    super.set(`${salt.toString('hex')}:${password.toString('hex')}`, ...args);
  }
}

export class DateColumn extends ValueColumn {
  constructor(type, ...args) {
    super(_.identity, ...args);
  }

  set(value, ...args) {
    super.set(value ? new Date(value).toISOString().substr(0, 10) : value, ...args);
  }

  get(...args) {
    const value = super.get(...args);

    if (value instanceof Date) {
      return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0))
        .toISOString()
        .substr(0, 10);
    }

    return value;
  }
}

export class DateTimeColumn extends ValueColumn {
  constructor(...args) {
    super(value => new Date(value), ...args);
  }
}

export class PrimaryKeyColumn extends ValueColumn {
  set(value, data, model) {
    super.set(model.constructor.fromGlobalId(value), data, model);
  }

  get(data, model) {
    const value = super.get(data, model);
    return value ? model.constructor.toGlobalId(value) : null;
  }
}

export class ListColumn extends ValueColumn {
  set(values, data) {
    _.set(data, this._.name, _.map(values, this.fromModel.bind(this)));
  }

  get(data, model) {
    return _.map(data[this._.name], value => this.toModel(value, model));
  }
}

export class ArchiveColumn {
  enumerable = true;

  set name(value) {
    this._.columnObj.name = value;
  }

  get name() {
    return this._.columnObj.name;
  }

  constructor(columnObj = new ValueColumn(), column = 'archive') {
    this._ = { columnObj, column };
  }

  getArchive(data) {
    if (!_.isPlainObject(data[this._.column])) {
      data[this._.column] = {}; // eslint-disable-line
    }

    return data[this._.column];
  }

  set(value, data, model) {
    this._.columnObj.set(value, this.getArchive(data), model);
  }

  get(data, model) {
    return this._.columnObj.get(this.getArchive(data), model);
  }
}

export class ReadOnlyColumn extends ValueColumn {
  constructor(...args) {
    super(...args);

    this.set = _.identity;
    if (!isType(args[0])) {
      this.get = args[0].bind(this);
    }
  }
}

export class CustomColumn extends ValueColumn {
  constructor(configs, ...args) {
    super(String, ...args);
    if (configs && configs.set) this.set = configs.set.bind(this);
    if (configs && configs.get) this.get = configs.get.bind(this);
  }
}
