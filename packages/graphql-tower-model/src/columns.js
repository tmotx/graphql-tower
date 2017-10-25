import _ from 'lodash';
import crypto from 'crypto';

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
    return this._.serialize;
  }

  constructor(serialize = String, name) {
    this._ = {};
    this.name = name;
    this.serialize = serialize;
  }

  fromModel(value) {
    if (value === null || value === undefined) return value;

    const Serialize = this.serialize;
    if (Serialize.load) return value ? value.nativeId || value : null;

    return Serialize(value);
  }

  toModel(value, cache) {
    const Serialize = this.serialize;
    return Serialize.load ? Serialize.load(value, cache) : Serialize(value);
  }

  set(value, data) {
    data[this._.name] = this.fromModel(value); // eslint-disable-line
  }

  get(data, model) {
    const value = data[this._.name];
    return _.isUndefined(value) ? null : this.toModel(value, model.cache);
  }
}

export class HashColumn extends ValueColumn {
  set(value, ...args) {
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
    super.set(value instanceof Date ? value.toISOString().substr(0, 10) : value, ...args);
  }

  get(...args) {
    const value = super.get(...args);

    if (value instanceof Date) {
      return `${value.getFullYear()}-${_.padStart(value.getMonth() + 1, 2, 0)}-${_.padStart(value.getDate(), 2, 0)}`;
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
  set(value, data) {
    data[this._.name] = _.map(value, this.fromModel.bind(this)); // eslint-disable-line
  }

  get(data) {
    return _.map(data[this._.name], this.toModel.bind(this));
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

    this.set = () => {};
    if (!isType(args[0])) {
      this.get = args[0].bind(this);
    }
  }
}

export class CustomColumn extends ValueColumn {
  constructor({ set, get }, ...args) {
    super(String, ...args);
    if (set) this.set = set.bind(this);
    if (get) this.get = get.bind(this);
  }
}
