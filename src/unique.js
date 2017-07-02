const _ = require('lodash');
const os = require('os');
const base = require('base-x');

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

let index = 0;
const datetime = Buffer.alloc(6);
const machine = Buffer.alloc(4);
const instance = Buffer.from(process.env.INSTANCE_ID || os.hostname());
machine.writeUInt16BE(instance.readUInt16BE(instance.length - 2), 0);
machine.writeUInt16BE(process.pid & 0xFFFF, 2); // eslint-disable-line

module.exports = function uniqueId() {
  datetime.writeUIntBE(Date.now(), 0, 6);

  index += 1;
  const seq = Buffer.alloc(4);
  seq.writeUIntBE(index & 0xFFFFFF, 0, 3); // eslint-disable-line
  seq.writeUInt8(_.random(0xFF), 3);

  return bs62.encode(Buffer.concat([datetime, machine, seq], 14));
};
