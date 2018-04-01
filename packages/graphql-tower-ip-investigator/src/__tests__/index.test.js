import IPInvestigator from '../';

describe('ip-investigator', () => {
  it('IPInvestigator', () => {
    expect(new IPInvestigator('27.242.94.11')).toMatchSnapshot();
  });

  it('Invalid IP Address', () => {
    expect(() => new IPInvestigator())
      .toThrowError(new Error('ipaddr: the address has neither IPv6 nor IPv4 format'));
  });

  it('From UUID', () => {
    expect(new IPInvestigator('00000000-0000-0000-0000-ffff3b788c67').ip).toBe('59.120.140.103');
    expect(new IPInvestigator('20010db8-02de-0000-0000-000000000e13').ip).toBe('2001:db8:2de::e13');
  });

  it('isReserved', () => {
    expect((new IPInvestigator('27.242.94.11')).isReserved).toBe(false);
    expect((new IPInvestigator('192.168.0.1')).isReserved).toBe(true);
    expect((new IPInvestigator('127.0.0.1')).isReserved).toBe(true);
    expect((new IPInvestigator('febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).isReserved).toBe(true);
  });

  it('isAWS', () => {
    expect((new IPInvestigator('27.242.94.11')).isAWS).toBe(false);
    expect((new IPInvestigator('18.216.10.1')).isAWS).toBe(true);
    expect((new IPInvestigator('54.239.179.14')).isAWS).toBe(true);
    expect((new IPInvestigator('54.239.179.14')).aws).toMatchSnapshot();
  });

  it('toIPv4', () => {
    expect((new IPInvestigator('59.120.140.103')).toIPv4()).toBe('59.120.140.103');
    expect((new IPInvestigator('::ffff:10.10.1.201')).toIPv4()).toBe('10.10.1.201');
    expect((new IPInvestigator('::ffff:c0a8:5909')).toIPv4()).toBe('192.168.89.9');
    expect((new IPInvestigator('2001:DB8:2de::e13')).toIPv4()).toBe(false);
  });

  it('toIPv6', () => {
    expect((new IPInvestigator('59.120.140.103')).toIPv6()).toBe('::ffff:3b78:8c67');
    expect((new IPInvestigator('::ffff:10.10.1.201')).toIPv6()).toBe('::ffff:a0a:1c9');
    expect((new IPInvestigator('::ffff:c0a8:5909')).toIPv6()).toBe('::ffff:c0a8:5909');
    expect((new IPInvestigator('2001:DB8:2de::e13')).toIPv6()).toBe('2001:db8:2de::e13');
  });

  it('toString', () => {
    expect((new IPInvestigator('59.120.140.103')).toString()).toBe('59.120.140.103');
    expect((new IPInvestigator('::ffff:10.10.1.201')).toString()).toBe('10.10.1.201');
    expect((new IPInvestigator('::ffff:c0a8:5909')).toString()).toBe('192.168.89.9');
    expect((new IPInvestigator('2001:DB8:2de::e13')).toString()).toBe('2001:db8:2de::e13');
    expect((new IPInvestigator('3000:db8:ffff:1:201:2ff:fe03:405')).toString()).toBe('3000:db8:ffff:1:201:2ff:fe03:405');
  });

  it('toUUID', () => {
    expect((new IPInvestigator('59.120.140.103')).toUUID()).toBe('00000000-0000-0000-0000-ffff3b788c67');
    expect((new IPInvestigator('::ffff:10.10.1.201')).toUUID()).toBe('00000000-0000-0000-0000-ffff0a0a01c9');
    expect((new IPInvestigator('::ffff:c0a8:5909')).toUUID()).toBe('00000000-0000-0000-0000-ffffc0a85909');
    expect((new IPInvestigator('2001:DB8:2de::e13')).toUUID()).toBe('20010db8-02de-0000-0000-000000000e13');
  });
});
