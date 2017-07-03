const _ = require('lodash');
const os = require('os');
const base = require('base-x');

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

const bth = [];
for (let idx = 0; idx < 256; idx += 1) {
  bth[idx] = (idx + 0x100).toString(16).substr(1);
}

let index = 0;
let lastSecs = 0;
const datetime = Buffer.alloc(6);
const machine = Buffer.alloc(6);
const instance = Buffer.from(process.env.INSTANCE_ID || os.hostname());
machine.writeUInt16BE(instance.readUInt16BE(instance.length - 3), 0);
machine.writeUInt16BE(process.pid & 0xFFFFFF, 3); // eslint-disable-line

function unique() {
  if (lastSecs !== Date.now()) {
    lastSecs = Date.now();
    index = 0;
  }

  datetime.writeUIntBE(lastSecs, 0, 6);

  index += 1;
  const seq = Buffer.alloc(4);
  seq.writeUIntBE(index & 0xFFFFFF, 0, 3); // eslint-disable-line
  seq.writeUInt8(_.random(0xFF), 3);

  return new unique.UniqueId(Buffer.concat([datetime, seq, machine], 16));
}

unique.UniqueId = class UniqueId {
  constructor(id) {
    if (_.isBuffer(id)) this.buf = id;
    else if (_.isString(id)) this.buf = Buffer.from(id);
    else this.buf = unique();
  }

  toString() {
    return bs62.encode(this.buf);
  }

  toUUID() {
    const buf = this.buf;
    let i = 0;
    return [
      `${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}`,  // eslint-disable-line
      `${bth[buf[i++]]}${bth[buf[i++]]}`,  // eslint-disable-line
      `${bth[buf[i++]]}${bth[buf[i++]]}`,  // eslint-disable-line
      `${bth[buf[i++]]}${bth[buf[i++]]}`,  // eslint-disable-line
      `${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}`,  // eslint-disable-line
    ].join('-');
  }
};

module.exports = unique;
