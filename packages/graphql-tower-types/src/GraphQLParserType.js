import { GraphQLScalarType } from 'graphql';

export default class extends GraphQLScalarType {
  constructor(config) {
    super({
      serialize: config.parseValue,
      parseLiteral: (ast) => {
        try { return config.parseValue(ast.value); } catch (e) { return null; }
      },
      ...config,
    });
  }
}
