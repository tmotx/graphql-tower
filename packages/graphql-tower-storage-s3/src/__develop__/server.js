/* eslint no-console: 0 */
import _ from 'lodash';
import express from 'express';
import next from 'next';
import bodyParser from 'body-parser';
import StorageS3 from '../';

const storageS3 = new StorageS3(
  _.pick(process.env, ['AWS_ACCESS', 'STORAGE_URL', 'LAMBDA_PREFIX']),
);

const port = process.env.PORT || 8080;

const app = next({ dev: true, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.get('/credentials', (req, res) => {
    res.json(storageS3.generateTemporaryCredentials());
  });

  server.post('/upload', bodyParser.json(), async (req, res) => {
    const file = await storageS3.checkContentType(req.body.key);
    console.log('file: ', file);
    res.json({ status: 'ok' });

    if (/^video/i.test(file)) {
      console.log(
        'confirm-video',
        await storageS3.confirmVideo(req.body.key, 'develop-20180325'),
      );
      return;
    }

    console.log(
      'confirm-image',
      await storageS3.confirmImage(req.body.key, 'develop-20180325'),
    );
  });

  server.get('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`); // eslint-disable-line
  });
});
