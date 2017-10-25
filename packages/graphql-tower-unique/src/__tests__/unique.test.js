import _ from 'lodash';
import { fork } from 'child_process';
import unique from '../index';

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
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
      new Promise(resolve => fork(`${__dirname}/unique.js`, ['child']).on('message', resolve)),
    ]));
    expect(_.uniq(uid).length).toBe(10000);
  });

  it('sort', async () => {
    const uid = _.range(0, 1000).map(unique);
    expect(_.clone(uid).sort()).toEqual(uid);
  });

  it('toUUID & fromUUID', async () => {
    const uniqueId = unique();
    expect(unique.fromUUID(unique.toUUID(uniqueId))).toBe(uniqueId);
    const uuid = '00395926-aa6a-47b9-be6a-befd299b2290';
    expect(unique.toUUID(unique.fromUUID(uuid))).toBe(uuid);
  });
});
