import toInteger from 'lodash/parseInt';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    super({
      serialize: toInteger,
      parseValue(value) {
        const integer = toInteger(value);

        if (
          Number.isNaN(integer) ||
          (config.min !== undefined && integer < config.min) ||
          (config.max !== undefined && integer > config.max)
        ) {
          throw new TypeError(`${config.name} cannot represent non value: ${value}`);
        }

        return integer;
      },
      ...config,
    });
  }
}
