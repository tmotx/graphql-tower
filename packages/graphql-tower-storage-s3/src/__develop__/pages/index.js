import React from 'react';
import Dropzone from 'react-dropzone';
import Head from 'next/head';
import upload from 'graphql-tower-storage-s3/lib/upload';

export default class Index extends React.PureComponent {
  onDrop = async (files) => {
    const credentials = await (await fetch('./credentials')).json();
    await upload(credentials, files[0]);
  }

  render() {
    return (
      <div>
        <Head>
          <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.26.0/polyfill.min.js" />
        </Head>
        <Dropzone onDrop={this.onDrop} />
      </div>
    );
  }
}
