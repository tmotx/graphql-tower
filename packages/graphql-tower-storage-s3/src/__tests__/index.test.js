import fs from 'fs';
import { promise, createReadStream } from 'aws-sdk';
import StorageS3 from '../';
import upload from '../upload';

jest.mock('graphql-tower-unique', () => () => 'UNIQUE_GUID');

const formData = jest.fn();
global.FormData = () => ({ append: formData });

const xmlHttpRequest = jest.fn();
global.XMLHttpRequest = () => {
  let req;
  const obj = {
    open: (...args) => { req = args; },
    onload: () => {},
    onerror: () => {},
    send: () => xmlHttpRequest(...req, obj).then(obj.onload, obj.onerror),
    upload: {},
  };
  return obj;
};

describe('storage s3', () => {
  const storage = new StorageS3({ STORAGE_URL: 's3://username:secret_key@ap-northeast-1/graphql-tower' });

  it('is required', () => {
    expect(() => new StorageS3()).toThrowError(new TypeError('STORAGE_URL is required'));
    expect(() => new StorageS3({ STORAGE_URL: 's3://ap-northeast-1/graphql-tower' })).not.toThrowError();
  });

  describe('checkContentType', () => {
    it('when type is jpeg', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.jpg`));
      expect(await storage.checkContentType('XYZ')).toBe('image/jpeg');
      expect(createReadStream).toHaveBeenCalledWith({ Key: 'uploader/XYZ', method: 'getObject' });
      expect(createReadStream).toHaveBeenCalledTimes(1);
    });

    it('when type is png', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.png`));
      expect(await storage.checkContentType('XYZ')).toBe('image/png');
    });

    it('when type is gif', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.gif`));
      expect(await storage.checkContentType('XYZ')).toBe('image/gif');
    });

    it('when type is mp4', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.mp4`));
      expect(await storage.checkContentType('XYZ')).toBe('video/mp4');
    });

    it('when type is mov', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.mov`));
      expect(await storage.checkContentType('XYZ')).toBe('video/quicktime');
    });

    it('when unsupported file type', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.gz`));
      await expect(storage.checkContentType('XYZ')).rejects.toEqual(new TypeError('unsupported file type'));
    });

    it('when not found', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample`));
      await expect(storage.checkContentType('XYZ')).rejects.toEqual(new TypeError('unsupported file type'));
    });
  });

  describe('confirm', () => {
    it('successfully confirmed', async () => {
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.gif`));
      await storage.confirm('XYZ', 'IMAGE_UPLOAD_UUID');
      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        CopySource: 'graphql-tower/uploader/XYZ', Key: 'media/IMAGE_UPLOAD_UUID', method: 'copyObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'media/IMAGE_UPLOAD_UUID', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'media/IMAGE_UPLOAD_UUID_cover', method: 'upload',
      }));
      expect(promise).toHaveBeenCalledTimes(2);
      expect(createReadStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirmVideo', () => {
    it('successfully confirmed', async () => {
      await storage.confirmVideo('XYZ', 'VIDEO_UPLOAD_UUID');
      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        FunctionName: 'media-converter_confirm-video',
        Payload: JSON.stringify({
          region: 'ap-northeast-1',
          bucket: 'graphql-tower',
          from: 'uploader/XYZ',
          target: 'media/VIDEO_UPLOAD_UUID',
          accessKeyId: 'username',
          secretAccessKey: 'secret_key',
        }),
      }));
      expect(promise).toHaveBeenCalledTimes(1);
    });

    it('successfully confirmed with cdn', async () => {
      const storageForCdn = new StorageS3({
        STORAGE_URL: 's3://username:secret_key@ap-northeast-1/graphql-tower',
        CDN_ID: 'AWS_CDN_ID',
      });
      await storageForCdn.confirmVideo('XYZ', 'VIDEO_UPLOAD_UUID', ['/media/MEDIA_ID']);
      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        FunctionName: 'media-converter_confirm-video',
        Payload: JSON.stringify({
          region: 'ap-northeast-1',
          bucket: 'graphql-tower',
          from: 'uploader/XYZ',
          target: 'media/VIDEO_UPLOAD_UUID',
          accessKeyId: 'username',
          secretAccessKey: 'secret_key',
          cdnId: 'AWS_CDN_ID',
          cdnPaths: ['/media/MEDIA_ID'],
        }),
      }));
      expect(promise).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchCover', () => {
    it('successfully fetch', async () => {
      promise.mockReturnValueOnce(Promise.reject(new Error('not found')));
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.jpg`));

      await storage.fetchCover('IMAGE_KEY');

      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_1920x', method: 'headObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'media/IMAGE_KEY_cover', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_1920x', method: 'upload',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_1920x', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledTimes(2);
      expect(createReadStream).toHaveBeenCalledTimes(2);
    });

    it('successfully fetch use cache', async () => {
      await storage.fetchCover('IMAGE_KEY');

      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_1920x', method: 'headObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_1920x', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledTimes(1);
      expect(createReadStream).toHaveBeenCalledTimes(1);
    });

    it('when input width and height', async () => {
      await storage.fetchCover('IMAGE_KEY', '2048', '2048');

      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_2048x2048', method: 'headObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_cover_2048x2048', method: 'getObject',
      }));
    });
  });

  describe('fetchPreCover', () => {
    it('successfully fetch', async () => {
      promise.mockReturnValueOnce(Promise.reject(new Error('not found')));
      createReadStream.mockReturnValueOnce(fs.createReadStream(`${__dirname}/sample.png`));

      await storage.fetchPreCover('IMAGE_KEY');

      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_128x', method: 'headObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'media/IMAGE_KEY_cover', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_128x', method: 'upload',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_128x', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledTimes(2);
      expect(createReadStream).toHaveBeenCalledTimes(2);
    });

    it('successfully fetch use cache', async () => {
      await storage.fetchPreCover('IMAGE_KEY');

      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_128x', method: 'headObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_128x', method: 'getObject',
      }));
      expect(promise).toHaveBeenCalledTimes(1);
      expect(createReadStream).toHaveBeenCalledTimes(1);
    });

    it('when input width and height', async () => {
      await storage.fetchPreCover('IMAGE_KEY', '2048', '2048');

      expect(promise).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_2048x2048', method: 'headObject',
      }));
      expect(createReadStream).toHaveBeenCalledWith(expect.objectContaining({
        Key: 'cache/IMAGE_KEY_precover_2048x2048', method: 'getObject',
      }));
    });
  });

  describe('upload', () => {
    it('successfully upload', async () => {
      xmlHttpRequest.mockReturnValueOnce(Promise.resolve());
      await upload(storage.generateTemporaryCredentials(), 'FILE_PATH');
      expect(formData).toHaveBeenCalledWith('file', 'FILE_PATH');
      expect(formData).toHaveBeenCalledWith('policy', expect.anything());
      expect(formData).toHaveBeenCalledWith('success_action_status', '201');
      expect(formData).toHaveBeenCalledWith('x-amz-algorithm', 'AWS4-HMAC-SHA256');
      expect(formData).toHaveBeenCalledWith('x-amz-credential', expect.stringContaining('username/'));
      expect(formData).toHaveBeenCalledWith('x-amz-date', expect.anything());
      expect(formData).toHaveBeenCalledWith('x-amz-signature', expect.anything());
      expect(xmlHttpRequest).toHaveBeenCalledWith('POST', 'https://graphql-tower.s3.amazonaws.com', expect.anything());
      expect(xmlHttpRequest).toHaveBeenCalledTimes(1);

      const request = xmlHttpRequest.mock.calls[0][2];
      request.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
    });

    it('when network error', async () => {
      xmlHttpRequest.mockReturnValueOnce(Promise.reject());
      await expect(upload(storage.generateTemporaryCredentials(), 'FILE_PATH'))
        .rejects.toEqual(new Error('failed to upload: network error'));
    });

    it('onprogress', async () => {
      const onprogress = jest.fn();
      xmlHttpRequest.mockReturnValueOnce(Promise.resolve());
      await upload(storage.generateTemporaryCredentials(), 'FILE_PATH', onprogress);

      const request = xmlHttpRequest.mock.calls[0][2];
      request.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
      expect(onprogress).toHaveBeenCalledWith(0.5);
    });
  });
});
