export default function assertResult(value, ThrowError) {
  if (!value) {
    if (ThrowError && (ThrowError.prototype instanceof Error || ThrowError.name === 'Error')) {
      throw new ThrowError();
    } else if (ThrowError instanceof Error) {
      throw ThrowError;
    }
  }

  return value;
}
