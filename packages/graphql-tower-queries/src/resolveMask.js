export default function resolveMask(checker, fieldName) {
  return async (payload, args, context, info) => {
    try {
      const reply = await checker(payload, args, context, info);
      if (reply !== true) throw new Error();
      return payload[fieldName || info.fieldName];
    } catch (e) {
      return null;
    }
  };
}
