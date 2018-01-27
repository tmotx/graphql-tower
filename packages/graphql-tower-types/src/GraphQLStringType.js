import toString from 'lodash/toString';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    super({
      serialize: toString,
      parseValue(value) {
        const string = toString(value);

        if (config.maxLength !== undefined && string.length > config.maxLength) {
          throw new TypeError(`${config.name} length more than the maximum length of ${config.maxLength}`);
        }

        if (config.minLength !== undefined && string.length < config.minLength) {
          throw new TypeError(`${config.name} length less than the minimum length of ${config.minLength}`);
        }

        return string;
      },
      ...config,
    });
  }
}
