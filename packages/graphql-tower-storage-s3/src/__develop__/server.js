import express from 'express';
import next from 'next';
import bodyParser from 'body-parser';
import StorageS3 from '../';

const storageS3 = new StorageS3({
  STORAGE_URL: 's3://AKIAIMJ43HWRDJ5Q54QQ:wIe3NtN24gBtov+6PaX31vnKcVDZRGMlKmu325PA@ap-northeast-1/tmot-stage',
});

const port = process.env.PORT || 8080;

const app = next({ dev: true, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.get('/credentials', (req, res) => {
    res.json(storageS3.generateTemporaryCredentials());
  });

  server.post('/upload', bodyParser.json(), async (req, res) => {
    const type = await storageS3.checkContentType(req.body.key);
    console.log('type', type);
    res.json({ status: 'ok' });

    const reply = await storageS3.confirmVideo(req.body.key, 'develop-20180209');
    console.log(reply);
  });

  server.get('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`); // eslint-disable-line
  });
});
