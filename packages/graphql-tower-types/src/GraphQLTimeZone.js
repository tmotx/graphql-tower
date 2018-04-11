import toNumber from 'lodash/toNumber';
import toInteger from 'lodash/parseInt';
import GraphQLParserType from './GraphQLParserType';

function pad(value) {
  if (value < 10) return `0${value}`;
  return value;
}

const timezoneRegex = /^[+-](?:2[0-3]|[01][0-9]):[0-5][0-9]$/;

export default new GraphQLParserType({
  name: 'TimeZone',
  description: 'from -24 to 24 or -24:00 to +24:00',
  parseValue(value) {
    if (timezoneRegex.test(value)) return value;

    let zone = toNumber(value);

    if (Number.isNaN(zone)) {
      throw new TypeError(`TimeZone cannot represent non value: ${value}`);
    }

    zone *= (zone < 24 && zone > -24) ? 60 : -1;

    const abs = Math.abs(zone);
    return `${zone >= 0 ? '+' : '-'}${pad(toInteger(abs / 60) % 24)}:${pad(abs % 60)}`;
  },
  fake: '+08:30',
});
