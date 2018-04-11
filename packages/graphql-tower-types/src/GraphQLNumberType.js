import _ from 'lodash';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    const max = _.isUndefined(config.max) ? 1000 : config.max;
    const min = _.isUndefined(config.min) ? -100 : config.min;

    super({
      serialize: _.toNumber,
      parseValue(value) {
        const number = _.toNumber(value);

        if (Number.isNaN(number) || !_.inRange(number, config.min, config.max)) {
          throw new TypeError(`${config.name} cannot represent non value: ${value}`);
        }

        return number;
      },
      ..._.defaults(config, { fake: ((max - min) / 2) + 0.5 }),
    });
  }
}
