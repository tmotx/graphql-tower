import fs from 'fs';
import { execFile } from './fragmentTypes';

execFile(require(process.argv[1])) // eslint-disable-line
  .then(data => fs.writeFileSync(process.argv[2], data))
  .then(() => process.exit());
