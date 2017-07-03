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

  return bs62.encode(Buffer.concat([datetime, seq, machine], 16));
}

unique.fromUUID = function fromUUID(uuid) {
  const buf = Buffer.from(uuid.replace(/-/g, ''), 'hex');
  return bs62.encode(buf);
};

unique.toUUID = function toUUID(uniqueId) {
  const buf = bs62.decode(uniqueId);
  const uuid = /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/.exec(buf.toString('hex'));

  return `${uuid[1]}-${uuid[2]}-${uuid[3]}-${uuid[4]}-${uuid[5]}`;
};

module.exports = unique;
