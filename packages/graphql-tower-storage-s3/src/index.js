import min from 'lodash/min';
import url from 'url';
import crypto from 'crypto';
import sharp from 'sharp';
import AWS from 'aws-sdk';
import { NotFoundError } from 'graphql-tower-errors';
import unique from 'graphql-tower-unique';

function createHmacDigest(key, data) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.end(data);
  return hmac.read();
}

function createDate() {
  const date = new Date().toISOString();
  return date.substr(0, 4) + date.substr(5, 2) + date.substr(8, 2);
}

export default class StorageS3 {
  accessKeyId = '';

  secretAccessKey = '';

  constructor(env: Object = {}) {
    if (!env.STORAGE_URL) {
      throw new TypeError('STORAGE_URL is required');
    }

    const uri = url.parse(env.STORAGE_URL);

    this.region = uri.hostname;
    this.bucket = uri.path.substr(1);

    const configs = { region: this.region, params: { Bucket: this.bucket } };

    if (uri.auth) {
      const [accessKeyId, secretAccessKey] = uri.auth.split(':');
      this.accessKeyId = accessKeyId;
      configs.accessKeyId = accessKeyId;
      this.secretAccessKey = secretAccessKey;
      configs.secretAccessKey = secretAccessKey;
    }

    this.s3 = new AWS.S3(configs);

    return this;
  }

  async transform(fromKey, toKey, transform = sharp().jpeg()) {
    const from = this.s3.getObject({ Key: fromKey });
    const readStream = from.createReadStream();
    return this.s3.upload({ Key: toKey, Body: readStream.pipe(transform) }).promise();
  }

  async checkContentType(key) {
    try {
      const reply = await this.s3.headObject({ Key: `uploader/${key}` }).promise();

      if (['image/png', 'image/jpeg'].indexOf(reply.ContentType) > -1) {
        return true;
      }

      throw new Error();
    } catch (e) {
      throw new TypeError('unsupported file type');
    }
  }

  async confirm(key, toKey = unique()) {
    try {
      await this.s3.copyObject({ CopySource: `${this.bucket}/uploader/${key}`, Key: `media/${toKey}` }).promise();
      await this.transform(`media/${toKey}`, `media/${toKey}_cover`);

      return toKey;
    } catch (e) {
      throw new NotFoundError();
    }
  }

  async fetchCover(key, width = 1920, height = null) {
    const cacheName = `cache/${key}_cover_${[width, height].join('x')}`;

    try {
      await this.s3.headObject({ Key: cacheName }).promise();
    } catch (e) {
      await this.transform(`media/${key}_cover`, cacheName, sharp().resize(width, height).jpeg());
    }

    return this.s3.getObject({ Key: cacheName }).createReadStream();
  }

  async fetchPreCover(key, value, height = null) {
    const width = min([value, 128]);
    const cacheName = `cache/${key}_precover_${[width, height].join('x')}`;

    try {
      await this.s3.headObject({ Key: cacheName }).promise();
    } catch (e) {
      await this.transform(`media/${key}_cover`, cacheName, sharp().resize(width, height).blur(9).jpeg());
    }

    return this.s3.getObject({ Key: cacheName }).createReadStream();
  }

  generateTemporaryCredentials(filename = unique()) {
    const key = `uploader/${filename}`;
    const algorithm = 'AWS4-HMAC-SHA256';

    // create date string for the current date
    const date = createDate();

    // http://docs.aws.amazon.com/zh_cn/AmazonS3/latest/API/RESTObjectPOST.html#RESTObjectPOST-requests
    const acl = 'public-read-write';

    const successActionStatus = '201';

    const credential = `${this.accessKeyId}/${date}/${this.region}/s3/aws4_request`;

    // create policy
    const policy = Buffer.from(JSON.stringify({
      expiration: new Date(new Date().getTime() + (60 * 1000)).toISOString(),
      conditions: [
        { bucket: this.bucket },
        { key },
        { acl },
        { success_action_status: successActionStatus },
        ['content-length-range', 1, 10 * 1024 * 1024],
        { 'x-amz-algorithm': algorithm },
        { 'x-amz-credential': credential },
        { 'x-amz-date': `${date}T000000Z` },
      ],
    })).toString('base64');

    // create signature with policy, aws secret key & other scope information
    const dateKey = createHmacDigest(`AWS4${this.secretAccessKey}`, date);
    const dateRegionKey = createHmacDigest(dateKey, this.region);
    const dateRegionServiceKey = createHmacDigest(dateRegionKey, 's3');
    const signingKey = createHmacDigest(dateRegionServiceKey, 'aws4_request');

    // sign policy document with the signing key to generate upload signature
    const signature = createHmacDigest(signingKey, policy).toString('hex');

    return JSON.stringify({
      endpointUrl: `https://${this.bucket}.s3.amazonaws.com`,
      filename,
      params: {
        key,
        acl,
        success_action_status: successActionStatus,
        policy,
        'x-amz-algorithm': algorithm,
        'x-amz-credential': credential,
        'x-amz-date': `${date}T000000Z`,
        'x-amz-signature': signature,
      },
    });
  }
}
