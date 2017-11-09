import min from 'lodash/min';
import url from 'url';
import sharp from 'sharp';
import AWS from 'aws-sdk';
import { NotFoundError } from 'graphql-tower-errors';
import unique from 'graphql-tower-unique';

export default class StorageS3 {
  constructor(env: Object = {}) {
    if (!env.STORAGE_URL) {
      throw new TypeError('STORAGE_URL is required');
    }

    const uri = url.parse(env.STORAGE_URL);

    this.bucket = uri.path.substr(1);

    const configs = { region: uri.hostname, params: { Bucket: this.bucket } };

    if (uri.auth) {
      const [accessKeyId, secretAccessKey] = uri.auth.split(':');
      configs.accessKeyId = accessKeyId;
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

  async upload(key, toKey = unique()) {
    try {
      const reply = await this.s3.headObject({ Key: `uploader/${key}` }).promise();

      if (['image/png', 'image/jpeg'].indexOf(reply.ContentType) < 0) {
        throw new TypeError('unsupported file type');
      }

      await this.s3.copyObject({ CopySource: `${this.bucket}/uploader/${key}`, Key: `media/${toKey}` }).promise();
      await this.transform(`media/${toKey}`, `media/${toKey}_cover`);

      return toKey;
    } catch (e) {
      if (e.message === 'unsupported file type') throw e;
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
}
