import { promise, pipe } from 'aws-sdk';
import { NotFoundError } from 'graphql-tower-errors';
import StorageS3 from '../';

jest.mock('graphql-tower-unique', () => () => 'UNIQUE_GUID');

describe('storage s3', () => {
  const storage = new StorageS3({ STORAGE_URL: 's3://username:secret_key@ap-northeast-1/graphql-tower' });

  it('is required', () => {
    expect(() => new StorageS3()).toThrowError(new TypeError('STORAGE_URL is required'));
    expect(() => new StorageS3({ STORAGE_URL: 's3://ap-northeast-1/graphql-tower' })).not.toThrowError();
  });

  describe('checkContentType', () => {
    it('when type is jpeg', async () => {
      promise.mockReturnValueOnce(Promise.resolve({ ContentType: 'image/jpeg' }));
      await storage.checkContentType('XYZ');
      expect(promise.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(1);
    });

    it('when type is png', async () => {
      promise.mockReturnValueOnce(Promise.resolve({ ContentType: 'image/png' }));
      await storage.checkContentType('XYZ');
      expect(promise.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(1);
    });

    it('when unsupported file type', async () => {
      promise.mockReturnValueOnce(Promise.resolve({ ContentType: 'application/epub+zip' }));
      await expect(storage.checkContentType('from XYZ')).rejects.toEqual(new TypeError('unsupported file type'));
      expect(promise).toHaveBeenCalledTimes(1);
    });

    it('when not found', async () => {
      promise.mockReturnValueOnce(Promise.reject(new Error('not found')));
      await expect(storage.checkContentType('XYZ')).rejects.toEqual(new TypeError('unsupported file type'));
      expect(promise).toHaveBeenCalledTimes(1);
    });
  });

  describe('upload', () => {
    it('successfully uploaded', async () => {
      pipe.mockReturnValueOnce('IMAGE_STREAM_BODY');
      await storage.upload('XYZ', 'IMAGE_UPLOAD_UUID');
      expect(promise.mock.calls).toMatchSnapshot();
      expect(pipe.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(2);
      expect(pipe).toHaveBeenCalledTimes(1);
    });

    it('successfully uploaded when use unique', async () => {
      pipe.mockReturnValueOnce('IMAGE_STREAM_BODY');
      await storage.upload('XYZ');
      expect(promise.mock.calls).toMatchSnapshot();
      expect(pipe.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(2);
      expect(pipe).toHaveBeenCalledTimes(1);
    });

    it('when not found', async () => {
      promise.mockReturnValueOnce(Promise.reject(new Error('not found')));
      await expect(storage.upload('XYZ')).rejects.toEqual(new NotFoundError());
      expect(promise).toHaveBeenCalledTimes(1);
      expect(pipe).toHaveBeenCalledTimes(0);
    });
  });

  describe('fetchCover', () => {
    it('successfully fetch', async () => {
      promise.mockReturnValueOnce(Promise.reject(new Error('not found')));
      pipe.mockReturnValueOnce('IMAGE_STREAM_BODY');

      const stream = await storage.fetchCover('IMAGE_KEY');
      expect(stream).toEqual({ pipe: expect.any(Function) });

      expect(promise.mock.calls).toMatchSnapshot();
      expect(pipe.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(2);
      expect(pipe).toHaveBeenCalledTimes(1);
    });

    it('successfully fetch use cache', async () => {
      const stream = await storage.fetchCover('IMAGE_KEY');
      expect(stream).toEqual({ pipe: expect.any(Function) });

      expect(promise.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(1);
      expect(pipe).toHaveBeenCalledTimes(0);
    });

    it('when input width and height', async () => {
      const stream = await storage.fetchCover('IMAGE_KEY', '2048', '2048');
      expect(stream).toEqual({ pipe: expect.any(Function) });
      expect(promise.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchPreCover', () => {
    it('successfully fetch', async () => {
      promise.mockReturnValueOnce(Promise.reject(new Error('not found')));
      pipe.mockReturnValueOnce('IMAGE_STREAM_BODY');

      const stream = await storage.fetchPreCover('IMAGE_KEY');
      expect(stream).toEqual({ pipe: expect.any(Function) });

      expect(promise.mock.calls).toMatchSnapshot();
      expect(pipe.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(2);
      expect(pipe).toHaveBeenCalledTimes(1);
    });

    it('successfully fetch use cache', async () => {
      const stream = await storage.fetchPreCover('IMAGE_KEY');
      expect(stream).toEqual({ pipe: expect.any(Function) });

      expect(promise.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(1);
      expect(pipe).toHaveBeenCalledTimes(0);
    });

    it('when input width and height', async () => {
      const stream = await storage.fetchPreCover('IMAGE_KEY', '2048', '2048');
      expect(stream).toEqual({ pipe: expect.any(Function) });
      expect(promise.mock.calls).toMatchSnapshot();
      expect(promise).toHaveBeenCalledTimes(1);
    });
  });
});
