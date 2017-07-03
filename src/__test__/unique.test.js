import _ from 'lodash';
import { fork } from 'child_process';
import unique from '../unique';

describe('unique', () => {
  it('async', async () => {
    const uid = _.flattenDeep(await Promise.all([
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
      new Promise(resolve => setImmediate(() => resolve(_.range(0, 10000).map(unique)))),
    ]));
    expect(_.uniq(uid).length).toBe(100000);
  });

  it('child process', async () => {
    const uid = _.flattenDeep(await Promise.all([
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`).on('message', resolve)),
    ]));
    expect(_.uniq(uid).length).toBe(10000);
  });

  it('sort', async () => {
    const uuid = _.range(0, 1000).map(() => unique().toUUID());
    expect(_.clone(uuid).sort()).toEqual(uuid);
    const hash = _.range(0, 1000).map(() => unique().toString());
    expect(_.clone(hash).sort()).toEqual(hash);
  });
});
