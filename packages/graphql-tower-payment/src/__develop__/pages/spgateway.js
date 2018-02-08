import 'babel-polyfill';
import React from 'react';

export default class Index extends React.PureComponent {
  state = {
    merchantId: '',
    merchantOrderNo: '',
    checkValue: '',
    timeStamp: '',
    amount: '',
    version: '',
    host: '',
  }

  componentDidMount() {
    this.onFetchCredentials();
  }

  onFetchCredentials = async () => {
    const spgateway = await (await fetch('./credentials/spgateway')).json();
    this.setState(spgateway);
  }

  render() {
    const {
      merchantId, merchantOrderNo, checkValue, timeStamp, amount, version, host,
    } = this.state;

    return (
      <div>
        <form name="Pay2go" method="post" action={host}>
          <div>MerchantID: <input name="MerchantID" value={merchantId} /></div>
          <div>RespondType: <input name="RespondType" value="JSON" /></div>
          <div>CheckValue: <input name="CheckValue" value={checkValue} /></div>
          <div>TimeStamp: <input name="TimeStamp" value={timeStamp} /></div>
          <div>Version: <input name="Version" value={version} /></div>
          <div>MerchantOrderNo: <input name="MerchantOrderNo" value={merchantOrderNo} /></div>
          <div>Amt: <input name="Amt" value={amount} /></div>
          <div>ItemDesc: <input name="ItemDesc" value="One thing by one code" /></div>
          <div>LoginType: <input name="LoginType" value="0" /></div>
          <div>CREDITAGREEMENT: <input name="CREDITAGREEMENT" value="1" /></div>
          <div>NotifyURL: <input name="NotifyURL" value="https://2bb0d870.ngrok.io/notify/spgateway" /></div>
          <div>TokenTerm: <input name="TokenTerm" value="XYZ" /></div>
          <div>TradeLimit: <input name="TradeLimit" value={10 * 60} /></div>
          <button type="submit">Payment</button>
        </form>
      </div>
    );
  }
}
