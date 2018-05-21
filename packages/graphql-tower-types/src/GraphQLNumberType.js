import _ from 'lodash';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    const min = _.isUndefined(config.min) ? -1000 : config.min;
    const max = _.isUndefined(config.max) ? 1000 : config.max;

    super({
      serialize: _.toNumber,
      parseValue(value) {
        const number = _.toNumber(value);

        if (Number.isNaN(number) || number < config.min || number > config.max) {
          throw new TypeError(`${config.name} cannot represent non value: ${value}`);
        }

        return number;
      },
      ..._.defaults(config, { fake: ((max - min) / 2) + 0.5 }),
    });
  }
}
