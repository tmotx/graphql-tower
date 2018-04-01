import _ from 'lodash';
import Maxmind from 'maxmind';
import IPAddr from 'ipaddr.js';
import IPIPNet from 'ipip-datx';
import { bufferToUuid, uuidToBuffer } from 'graphql-tower-helper';
import AWSIPRanges from './db/aws-ip-ranges.json';

export default class IPInvestigator {
  static lookupAWS = _.map(AWSIPRanges.prefixes, ({ ip_prefix, region, service }) => ({
    cidr: IPAddr.parseCIDR(ip_prefix), region, service,
  }));

  static lookupMaxmind = Maxmind.openSync(`${__dirname}/db/GeoLite2-Country.mmdb`);

  static setMaxmind(path) {
    this.lookupMaxmind = Maxmind.openSync(path);
  }

  static lookupIPIPNet = new IPIPNet.City(`${__dirname}/db/17monipdb.datx`);

  static setIPIPNet(path) {
    this.lookupIPIPNet = new IPIPNet.City(path);
  }

  ip = null;

  countryCode = null;

  countryName = null;

  registeredCountryCode = null;

  registeredCountryName = null;

  aws = null;

  isAWS = false

  isReserved = false;

  constructor(value) {
    const { lookupAWS, lookupMaxmind, lookupIPIPNet } = this.constructor;

    const trimValue = _.trim(value);
    const buffer = uuidToBuffer(trimValue);
    const ipaddr = buffer ? IPAddr.fromByteArray([...buffer]) : IPAddr.parse(trimValue);

    const isIPv4Mapped = ipaddr.kind() === 'ipv6' && ipaddr.isIPv4MappedAddress();
    this.ipaddr = isIPv4Mapped ? ipaddr.toIPv4Address() : ipaddr;
    this.ipv6Addr = ipaddr.kind() === 'ipv4' ? ipaddr.toIPv4MappedAddress() : ipaddr;
    this.ip = this.ipaddr.toString();

    this.isReserved = (this.ipaddr.range() !== 'unicast');
    if (this.isReserved) return;

    const maxmind = lookupMaxmind.get(this.ip);
    if (maxmind) {
      this.countryCode = _.get(maxmind, ['country', 'iso_code'], null);
      this.countryName = _.get(maxmind, ['country', 'names', 'en'], null);
      this.registeredCountryCode = _.get(maxmind, ['registered_country', 'iso_code'], null);
      this.registeredCountryName = _.get(maxmind, ['registered_country', 'names', 'en'], null);
    }

    if (this.ipaddr.kind() !== 'ipv4') return;

    const ipipNet = lookupIPIPNet.findSync(this.ip);
    if (ipipNet) {
      if (ipipNet[1] === '台湾') {
        this.countryCode = 'TW';
        this.countryName = 'Taiwan';
      } else if (ipipNet[0] === '中国') {
        this.countryCode = 'CN';
        this.countryName = 'China';
      }
    }

    const aws = _.find(lookupAWS, ({ cidr }) => this.ipaddr.match(cidr));
    if (aws) {
      this.aws = _.pick(aws, ['region', 'service']);
      this.isAWS = true;
    }
  }

  toIPv4() {
    return this.ipaddr.kind() === 'ipv4' ? this.ip : false;
  }

  toIPv6() {
    return this.ipv6Addr.toString();
  }

  toString() {
    return this.ip;
  }

  toUUID() {
    const { ipv6Addr } = this;
    return bufferToUuid(Buffer.from(ipv6Addr.toByteArray()));
  }
}
