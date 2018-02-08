/* eslint no-console: 0 */

import express from 'express';
import next from 'next';
import bodyParser from 'body-parser';
import Spgateway from '../Spgateway';

const spgateway = new Spgateway({
  PAY2GO_URL: 'https://nApJ6NPsN95qN2cU:fuJsiQOHDJwpcUuffGFSJpY9fYrNII2U@ccore.spgateway.com/MPG/mpg_gateway?id=MS33234675',
});

const port = process.env.PORT || 8080;

const app = next({ dev: true, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.get('/credentials/spgateway', (req, res) => {
    res.json(spgateway.generateTemporaryCredentials(`ORDER${Date.now()}`, 2000));
  });

  server.post('/notify/spgateway', bodyParser.urlencoded({ extended: false }), (req, res) => {
    console.log(spgateway.verifyCallback(req.body.JSONData));
    res.status(200).end();
  });

  server.get('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`); // eslint-disable-line
  });
});
