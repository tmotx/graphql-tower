import express from 'express';
import next from 'next';
import StorageS3 from '../';

const storageS3 = new StorageS3({
  STORAGE_URL: '',
});

const port = process.env.PORT || 8080;

const app = next({ dev: true, dir: './src/__develop__' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.get('/credentials', (req, res) => {
    res.json(storageS3.generateTemporaryCredentials());
  });

  server.get('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`); // eslint-disable-line
  });
});
