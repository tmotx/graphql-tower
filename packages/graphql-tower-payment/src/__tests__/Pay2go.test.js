import Pay2go from '../Pay2go';

describe('pay2go', () => {
  it('is required', () => {
    expect(() => new Pay2go()).toThrowError(new TypeError('PAY2GO_URL is required'));
  });

  it('PAY2GO_URL was not in a correct format', () => {
    expect(() => new Pay2go({ PAY2GO_URL: 'https://host/name' }))
      .toThrowError(new TypeError('PAY2GO_URL was not in a correct format'));
  });

  it('successfully generate credentials', () => {
    const pay2go = new Pay2go({
      PAY2GO_URL: 'https://nApJ6NPsN95qN2cU:fuJsiQOHDJwpcUuffGFSJpY9fYrNII2U@ccore.spgateway.com/MPG/mpg_gateway?id=MS33234675',
    });

    expect(pay2go.generateTemporaryCredentials('XXX', 1000)).toMatchSnapshot();
  });
});
