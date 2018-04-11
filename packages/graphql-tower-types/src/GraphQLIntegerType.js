import _ from 'lodash';
import GraphQLParserType from './GraphQLParserType';

export default class extends GraphQLParserType {
  constructor(config) {
    const max = _.isUndefined(config.max) ? 1000 : config.max;
    const min = _.isUndefined(config.min) ? -100 : config.min;

    super({
      serialize: _.parseInt,
      parseValue(value) {
        const integer = _.parseInt(value);

        if (Number.isNaN(integer) || !_.inRange(integer, config.min, config.max)) {
          throw new TypeError(`${config.name} cannot represent non value: ${value}`);
        }

        return integer;
      },
      ..._.defaults(config, { fake: (max - min) / 2 }),
    });
  }
}
