import url from 'url';
import crypto from 'crypto';
import fileType from 'file-type';
import sharp from 'sharp';
import AWS from 'aws-sdk';
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

function toFormat(transform, format) {
  return format === 'png' ? transform.png() : transform.jpeg();
}

export default class StorageS3 {
  accessKeyId = '';

  secretAccessKey = '';

  constructor(env: Object = {}) {
    if (!env.STORAGE_URL) {
      throw new TypeError('STORAGE_URL is required');
    }

    if (env.CDN_ID) {
      this.cdnId = env.CDN_ID;
    }

    const uri = url.parse(env.STORAGE_URL);

    this.region = uri.hostname;
    this.bucket = uri.path.substr(1);

    const configs = { region: this.region, params: { Bucket: this.bucket } };
    const auth = {};

    if (uri.auth) {
      const [accessKeyId, secretAccessKey] = uri.auth.split(':');
      auth.accessKeyId = accessKeyId;
      auth.secretAccessKey = secretAccessKey;
      this.accessKeyId = accessKeyId;
      this.secretAccessKey = secretAccessKey;
    }

    this.s3 = new AWS.S3({ ...auth, ...configs });
    this.lambda = new AWS.Lambda({ ...auth, region: this.region });

    return this;
  }

  async transform(fromKey, toKey, transform = sharp().jpeg()) {
    const from = this.s3.getObject({ Key: fromKey });
    const readStream = from.createReadStream();
    return this.s3.upload({ Key: toKey, Body: readStream.pipe(transform) }).promise();
  }

  async checkContentType(key) {
    try {
      const from = this.s3.getObject({ Key: `uploader/${key}` });
      const readStream = from.createReadStream();

      const chunk = await new Promise((resolve, reject) => {
        readStream.on('readable', () => resolve(readStream.read()));
        readStream.on('error', reject);
      });

      const { ext, mime } = fileType(chunk);
      if (['png', 'jpg', 'gif', 'mp4', 'webm', 'mov'].indexOf(ext) > -1) {
        return mime;
      }

      throw new Error();
    } catch (e) {
      throw new TypeError('unsupported file type');
    }
  }

  async confirm(key, toKey) {
    return this.s3.copyObject({ CopySource: `${this.bucket}/uploader/${key}`, Key: `media/${toKey}` }).promise();
  }

  async confirmImage(key, toKey, format) {
    await this.confirm(key, toKey);
    return this.transform(`media/${toKey}`, `media/${toKey}_cover`, toFormat(sharp(), format));
  }

  async confirmVideo(key, toKey, cdnPaths = []) {
    await this.confirm(key, toKey);

    const cdn = { cdnId: this.cdnId };
    if (this.cdnId && cdnPaths.length) {
      cdn.cdnPaths = cdnPaths;
    }

    return this.lambda.invoke({
      FunctionName: 'media-converter_confirm-video',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        region: this.region,
        bucket: this.bucket,
        from: `uploader/${key}`,
        target: `media/${toKey}`,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        ...cdn,
      }),
    }).promise();
  }

  async fetch(key) {
    return this.s3.getObject({ Key: `media/${key}` }).createReadStream();
  }

  async fetchMp4(key) {
    return this.s3.getObject({ Key: `media/${key}_mp4` }).createReadStream();
  }

  async fetchWebm(key) {
    return this.s3.getObject({ Key: `media/${key}_webm` }).createReadStream();
  }

  async fetchCover(key, format, width = 1920, height = null) {
    const cacheName = `cache/${key}_cover_${[width, height].join('x')}`;

    try {
      await this.s3.headObject({ Key: cacheName }).promise();
    } catch (e) {
      await this.transform(`media/${key}_cover`, cacheName, toFormat(sharp().resize(width, height), format));
    }

    return this.s3.getObject({ Key: cacheName }).createReadStream();
  }

  async fetchPreCover(key, format, width = 128, height = null) {
    const cacheName = `cache/${key}_precover_${[width, height].join('x')}`;

    try {
      await this.s3.headObject({ Key: cacheName }).promise();
    } catch (e) {
      await this.transform(`media/${key}_cover`, cacheName, toFormat(sharp().resize(width, height).blur(9), format));
    }

    return this.s3.getObject({ Key: cacheName }).createReadStream();
  }

  generateTemporaryCredentials(key = unique()) {
    const path = `uploader/${key}`;
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
        { key: path },
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
      key,
      params: {
        key: path,
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
