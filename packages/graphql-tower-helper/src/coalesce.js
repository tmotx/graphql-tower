export default function coalesce(...args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== undefined && args[index] !== null) {
      return args[index];
    }
  }

  return '';
}
