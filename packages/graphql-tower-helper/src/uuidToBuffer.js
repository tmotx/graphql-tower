const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export default function uuidToBuffer(value) {
  if (!uuid.test(value)) return null;

  const hex = value.replace(/-/gi, '');
  const buf = Buffer.alloc(16);
  for (let idx = 0; idx < 32; idx += 2) {
    buf.writeUInt8(`0x${hex[idx]}${hex[idx + 1]}`, idx / 2);
  }

  return buf;
}
