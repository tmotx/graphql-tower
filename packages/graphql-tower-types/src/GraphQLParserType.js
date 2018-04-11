import { GraphQLScalarType } from 'graphql';
import assertResult from 'graphql-tower-helper/assertResult';

export default class extends GraphQLScalarType {
  constructor(config) {
    super({
      serialize: config.parseValue,
      parseLiteral: (ast) => {
        try { return config.parseValue(ast.value); } catch (e) { return null; }
      },
      ...config,
    });

    this.fake = assertResult(config.fake, new TypeError('fake is required'));
  }
}
