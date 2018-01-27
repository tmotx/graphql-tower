import toString from 'lodash/toString';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    super({
      serialize: toString,
      parseValue(value) {
        const string = toString(value);

        if (!config.regex.test(string)) {
          throw new TypeError(`${config.name} cannot represent non value: ${value}`);
        }

        return string;
      },
      ...config,
    });
  }
}
