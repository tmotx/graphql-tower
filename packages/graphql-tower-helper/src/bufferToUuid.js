const uuid = /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/;

export default function bufferToUuid(value) {
  if (!(value instanceof Buffer)) return null;

  let hex = value.toString('hex');
  while (hex.length < 32) hex = `0${hex}`;

  const data = uuid.exec(hex);
  return `${data[1]}-${data[2]}-${data[3]}-${data[4]}-${data[5]}`;
}
