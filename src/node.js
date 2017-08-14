import _ from 'lodash';
import base from 'base-x';
import { GraphQLGID } from './type';

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuidParser = /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/;

class GlobalId {
  constructor(id, type, format = 'S') {
    this._.id = Buffer.from(id);
    this._.type = type;
    this._.format = format;
  }

  _ = {};

  get type() {
    return this._.type;
  }

  get id() {
    return this._.id;
  }

  toBigint() {
    return _.trimStart(this._.id.toString('hex'), '0');
  }

  toUUID() {
    const data = uuidParser.exec(this._.id.toString('hex'));
    return `${data[1]}-${data[2]}-${data[3]}-${data[4]}-${data[5]}`;
  }

  toString() {
    if (this._.format === 'N') {
      return this.toBigint();
    }

    if (this._.format === 'U') {
      return this.toUUID();
    }

    return this._.id.toString();
  }
}

export function isGlobalId(globalId) {
  return /^i[NUS][\w\d]+$/.test(globalId);
}

function fromId(value) {
  if (Buffer.isBuffer(value)) {
    return { format: 'S', idBuf: value };
  }

  const id = _.toString(value);

  if (uuid.test(id)) {
    const idHex = id.replace(/-/gi, '');
    const buf = Buffer.alloc(16);
    for (let idx = 0; idx < 32; idx += 2) {
      buf.writeUInt8(`0x${idHex[idx]}${idHex[idx + 1]}`, idx / 2);
    }
    return { format: 'U', idBuf: buf };
  }

  if (/^\d+$/gi.test(id) && id.length <= 20) {
    const buf = Buffer.alloc(10);
    let offset = 9;
    for (let idx = id.length - 2; idx > -2; idx -= 2) {
      buf.writeUInt8(
        `0x${_.defaultTo(id[idx], 0)}${_.defaultTo(id[idx + 1], 0)}`,
        offset,
      );
      offset -= 1;
    }
    return { format: 'N', idBuf: buf };
  }

  return { format: 'S', idBuf: Buffer.from(id) };
}

export function toGlobalId(type, id) {
  const typeBuf = Buffer.from(`${type}:`);
  const { format, idBuf } = fromId(id);
  const value = bs62.encode(Buffer.concat([typeBuf, idBuf], typeBuf.length + idBuf.length));
  return `i${format}${value}`;
}

export function fromGlobalId(value, verification) {
  try {
    if (!isGlobalId(value)) throw new TypeError();

    const buf = bs62.decode(value.substr(2));
    const splitIdx = buf.indexOf(':');

    const typeBuf = Buffer.allocUnsafe(splitIdx);
    buf.copy(typeBuf, 0, 0, splitIdx);
    const type = typeBuf.toString();

    const idBuf = Buffer.allocUnsafe(buf.length - splitIdx - 1);
    buf.copy(idBuf, 0, splitIdx + 1, buf.length);

    const gid = new GlobalId(idBuf, type, value[1]);

    if (verification) {
      if (verification !== type) throw TypeError();
      return gid.toString();
    }

    return gid;
  } catch (error) {
    throw TypeError('invalid global id');
  }
}

export class GraphQLGlobalIdField {

  type = GraphQLGID;

  description = 'The global id of an object';

  typeName = 'type';

  constructor(typeName) {
    this.typeName = typeName;
  }

  resolve = (payload, args, context, info) => {
    const value = _.isObject(payload) ? payload[info.fieldName] : payload;
    const typeName = this.typeName || info.parentType.name;

    return toGlobalId(typeName, value);
  }
}
