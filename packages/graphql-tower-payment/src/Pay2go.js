import url from 'url';
import crypto from 'crypto';
import assertResult from 'graphql-tower-helper/assertResult';

Date.now = jest.fn(() => 1517249431575);

export default class Pay2goPayment {
  constructor(env: Object = {}) {
    assertResult(env.PAY2GO_URL, new TypeError('PAY2GO_URL is required'));

    try {
      const uri = url.parse(env.PAY2GO_URL);
      const [hashIV, hashKey] = uri.auth.split(':');
      const host = `https://${uri.host}${uri.pathname}`;
      const merchantId = /id=(\w+)/i.exec(uri.query)[1];

      this.hashIV = hashIV;
      this.hashKey = hashKey;
      this.host = host;
      this.merchantId = merchantId;
      this.version = '1.2';
    } catch (e) {
      // empty
    }

    assertResult(
      this.hashIV && this.hashKey && this.host && this.merchantId,
      new TypeError('PAY2GO_URL was not in a correct format'),
    );
  }

  generateTemporaryCredentials(orderNo, amount) {
    const timeStamp = Date.now();
    const checkValue = [
      `HashKey=${this.hashKey}`,
      `Amt=${amount}`,
      `MerchantID=${this.merchantId}`,
      `MerchantOrderNo=${orderNo}`,
      `TimeStamp=${timeStamp}`,
      `Version=${this.version}`,
      `HashIV=${this.hashIV}`,
    ].join('&');

    return {
      merchantId: this.merchantId,
      merchantOrderNo: orderNo,
      timeStamp,
      amount,
      version: this.version,
      checkValue: crypto.createHash('sha256').update(checkValue, 'utf8').digest('hex'),
    };
  }
}
