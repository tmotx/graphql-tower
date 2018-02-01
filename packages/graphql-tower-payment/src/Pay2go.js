import url from 'url';
import crypto from 'crypto';
import assertResult from 'graphql-tower-helper/assertResult';

export default class Pay2goPayment {
  static hash(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase();
  }

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
      this.version = '1.1';
    } catch (e) {
      // empty
    }

    assertResult(
      this.hashIV && this.hashKey && this.host && this.merchantId,
      new TypeError('PAY2GO_URL was not in a correct format'),
    );
  }

  verifyCallback(data) {
    try {
      const payload = JSON.parse(data);
      const result = JSON.parse(payload.Result);

      const checkCode = [
        `HashIV=${this.hashIV}`,
        `Amt=${result.Amt}`,
        `MerchantID=${this.merchantId}`,
        `MerchantOrderNo=${result.MerchantOrderNo}`,
        `TradeNo=${result.TradeNo}`,
        `HashKey=${this.hashKey}`,
      ].join('&');

      if (result.CheckCode !== Pay2goPayment.hash(checkCode)) throw new Error();

      if (payload.Status !== 'SUCCESS') {
        return {
          status: false,
          merchantId: result.MerchantID,
          merchantOrderNo: result.MerchantOrderNo,
          tradeNo: result.TradeNo,
          amount: result.Amt,
          ip: result.IP,
          paymentType: result.PaymentType,
          cardNumber: `${result.Card6No}******${result.Card4No}`,
        };
      }

      return {
        status: true,
        merchantId: result.MerchantID,
        merchantOrderNo: result.MerchantOrderNo,
        tradeNo: result.TradeNo,
        amount: result.Amt,
        ip: result.IP,
        paymentType: result.PaymentType,
        escrowBank: result.EscrowBank,
        cardNumber: `${result.Card6No}******${result.Card4No}`,
        tokenUseStatus: result.TokenUseStatus,
        tokenValue: result.TokenValue,
        tokenLife: result.TokenLife,
      };
    } catch (e) {
      throw new Error('invalid checksum');
    }
  }

  generateTemporaryCredentials(orderNo, amount) {
    const timeStamp = Math.floor(Date.now() / 1000);
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
      host: this.host,
      version: this.version,
      checkValue: Pay2goPayment.hash(checkValue),
    };
  }
}
