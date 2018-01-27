import toNumber from 'lodash/toNumber';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    super({
      serialize: toNumber,
      parseValue(value) {
        const number = toNumber(value);

        if (
          Number.isNaN(number) ||
          (config.min !== undefined && number < config.min) ||
          (config.max !== undefined && number > config.max)
        ) {
          throw new TypeError(`${config.name} cannot represent non value: ${value}`);
        }

        return number;
      },
      ...config,
    });
  }
}
