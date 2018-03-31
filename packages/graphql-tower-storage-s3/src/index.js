import url from 'url';
import crypto from 'crypto';
import fileType from 'file-type';
import AWS from 'aws-sdk';
import unique from 'graphql-tower-unique';
import assertResult from 'graphql-tower-helper/assertResult';

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
    assertResult(env.AWS_ACCESS, new TypeError('AWS_ACCESS is required'));
    assertResult(env.STORAGE_URL, new TypeError('STORAGE_URL is required'));
    assertResult(env.LAMBDA_PREFIX, new TypeError('LAMBDA_PREFIX is required'));

    const [accessKeyId, secretAccessKey] = (env.AWS_ACCESS || '').split(':');
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;

    const uri = url.parse(env.STORAGE_URL);
    this.region = uri.hostname;
    this.bucket = uri.path.substr(1);

    this.lambdaPrefix = env.LAMBDA_PREFIX;
    this.cdnId = env.CDN_ID;

    const configs = {
      accessKeyId,
      secretAccessKey,
      region: this.region,
      params: { Bucket: this.bucket },
    };

    this.s3 = new AWS.S3(configs);
    this.lambda = new AWS.Lambda(configs);

    return this;
  }

  invokeLambda(functionName, payload) {
    const {
      region, bucket, accessKeyId, secretAccessKey, lambdaPrefix,
    } = this;

    return this.lambda.invoke({
      FunctionName: `${lambdaPrefix}_${functionName}`,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        region,
        bucket,
        accessKeyId,
        secretAccessKey,
        ...payload,
      }),
    }).promise()
      .then((res) => {
        if (JSON.parse(res.Payload).status !== 'ok') {
          throw new Error('Something crashed on aws-lambda, check out https://aws.amazon.com/tw/cloudwatch/ for more information.');
        }
        return res;
      });
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

  async confirmImage(key, toKey) {
    await this.confirm(key, toKey);
    return this.invokeLambda('confirm-image', {
      target: `media/${toKey}`,
    });
  }

  async confirmVideo(key, toKey, cdnPaths = []) {
    await this.confirm(key, toKey);

    return this.invokeLambda('confirm-video', {
      from: `uploader/${key}`,
      target: `media/${toKey}`,
      cdnId: this.cdnId,
      cdnPaths,
    });
  }

  async fetch(key, range) {
    const Key = `media/${key}`;
    await this.s3.headObject({ Key }).promise();
    return this.s3.getObject({ Key, Range: range }).createReadStream();
  }

  async fetchMp4(key, range) {
    const Key = `media/${key}_mp4`;
    await this.s3.headObject({ Key }).promise();
    return this.s3.getObject({ Key, Range: range }).createReadStream();
  }

  async fetchWebm(key, range) {
    const Key = `media/${key}_webm`;
    await this.s3.headObject({ Key }).promise();
    return this.s3.getObject({ Key, Range: range }).createReadStream();
  }

  async fetchCover(key, range, width = 1920, height = null) {
    const cacheName = `cache/${key}_cover_${[width, height].join('x')}`;

    try {
      await this.s3.headObject({ Key: cacheName }).promise();
    } catch (e) {
      await this.invokeLambda('resize-image', {
        source: `media/${key}_cover`,
        target: cacheName,
        width,
        height,
      });
    }

    return this.s3.getObject({ Key: cacheName, Range: range }).createReadStream();
  }

  async fetchPreCover(key, width = 128, height = null) {
    const cacheName = `cache/${key}_precover_${[width, height].join('x')}`;

    try {
      await this.s3.headObject({ Key: cacheName }).promise();
    } catch (e) {
      await this.invokeLambda('resize-image', {
        source: `media/${key}_cover`,
        target: cacheName,
        width,
        height,
        blur: 9,
      });
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
        ['content-length-range', 1, 150 * 1024 * 1024],
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
