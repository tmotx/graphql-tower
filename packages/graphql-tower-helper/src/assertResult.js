export default function assertResult(value, ThrowError) {
  if (!value && ThrowError && (ThrowError.prototype instanceof Error || ThrowError.name === 'Error')) {
    throw new ThrowError();
  }

  return value;
}
