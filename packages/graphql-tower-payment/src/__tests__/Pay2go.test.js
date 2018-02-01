import Pay2go from '../Pay2go';

Date.now = jest.fn(() => 1517249431575);

describe('pay2go', () => {
  const pay2go = new Pay2go({
    PAY2GO_URL: 'https://hashIV:hashKey@ccore.spgateway.com/MPG/mpg_gateway?id=MS33224646',
  });

  it('is required', () => {
    expect(() => new Pay2go()).toThrowError(new TypeError('PAY2GO_URL is required'));
  });

  it('PAY2GO_URL was not in a correct format', () => {
    expect(() => new Pay2go({ PAY2GO_URL: 'https://host/name' }))
      .toThrowError(new TypeError('PAY2GO_URL was not in a correct format'));
  });

  describe('verify callback', () => {
    it('successfully verify', () => {
      const reply = pay2go.verifyCallback('{"Status":"SUCCESS","Message":"\u6388\u6b0a\u6210\u529f","Result":"{\\"MerchantID\\":\\"MS33234675\\",\\"Amt\\":2000,\\"TradeNo\\":\\"18020121400311277\\",\\"MerchantOrderNo\\":\\"ORDER1517492273987\\",\\"RespondType\\":\\"JSON\\",\\"CheckCode\\":\\"64898105E6E446092291623924991F5E4CFC17D53BEB0E90C8BCABDD980DA367\\",\\"IP\\":\\"59.120.140.103\\",\\"EscrowBank\\":\\"HNCB\\",\\"PaymentType\\":\\"CREDIT\\",\\"RespondCode\\":\\"00\\",\\"Auth\\":\\"930637\\",\\"Card6No\\":\\"400022\\",\\"Card4No\\":\\"1111\\",\\"Exp\\":\\"2204\\",\\"TokenUseStatus\\":\\"1\\",\\"TokenValue\\":\\"f6e1079b40f6409d456100d6d262f3b03f201b78e41c6e740e14cca7ffb8f201\\",\\"TokenLife\\":\\"2022-04-30\\",\\"ECI\\":\\"\\",\\"PayTime\\":\\"2018-02-01 21:40:03\\"}"}');
      expect(reply).toMatchSnapshot();
    });

    it('when invalid checksum', () => {
      const reply = () => pay2go.verifyCallback('{"Status":"SUCCESS","Message":"\u6388\u6b0a\u6210\u529f","Result":"{\\"MerchantID\\":\\"MS33234675\\",\\"Amt\\":2000,\\"TradeNo\\":\\"18020121400311277\\",\\"MerchantOrderNo\\":\\"ORDER1517492273987\\",\\"RespondType\\":\\"JSON\\",\\"CheckCode\\":\\"5DDB499786A151EA648A927BB4AFA37282732CF299E8EF2E29796D410CA10D8E\\",\\"IP\\":\\"59.120.140.103\\",\\"EscrowBank\\":\\"HNCB\\",\\"PaymentType\\":\\"CREDIT\\",\\"RespondCode\\":\\"00\\",\\"Auth\\":\\"930637\\",\\"Card6No\\":\\"400022\\",\\"Card4No\\":\\"1111\\",\\"Exp\\":\\"2204\\",\\"TokenUseStatus\\":\\"1\\",\\"TokenValue\\":\\"f6e1079b40f6409d456100d6d262f3b03f201b78e41c6e740e14cca7ffb8f201\\",\\"TokenLife\\":\\"2022-04-30\\",\\"ECI\\":\\"\\",\\"PayTime\\":\\"2018-02-01 21:40:03\\"}"}');
      expect(reply).toThrowError(new Error('invalid checksum'));
    });

    it('when transaction failed', () => {
      const reply = pay2go.verifyCallback('{"Status":"MPG03009","Message":"\u4fe1\u7528\u5361\u6388\u6b0a\u5931\u6557_\u6388\u6b0a\u5931\u6557","Result":"{\\"MerchantID\\":\\"MS33234675\\",\\"Amt\\":2000,\\"TradeNo\\":\\"18020121410105996\\",\\"MerchantOrderNo\\":\\"ORDER1517492438108\\",\\"RespondType\\":\\"JSON\\",\\"CheckCode\\":\\"49AAE6AEA968B05E7CA20E63102D94848BE8D47D208A8FAB7C48D75D505B2304\\",\\"IP\\":\\"59.120.140.103\\",\\"EscrowBank\\":\\"-\\",\\"PaymentType\\":\\"CREDIT\\",\\"RespondCode\\":\\"54\\",\\"Auth\\":\\"\\",\\"Card6No\\":\\"400022\\",\\"Card4No\\":\\"1111\\",\\"Exp\\":\\"2505\\",\\"TokenUseStatus\\":\\"1\\",\\"ECI\\":\\"\\",\\"PayTime\\":\\"2018-02-01 21:41:01\\"}"}');
      expect(reply).toMatchSnapshot();
    });
  });

  it('successfully generate credentials', () => {
    expect(pay2go.generateTemporaryCredentials('XXX', 1000)).toMatchSnapshot();
  });
});
