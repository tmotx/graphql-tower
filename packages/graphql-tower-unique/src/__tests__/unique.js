const _ = require('lodash');
const unique = require('../index');

if (process.argv[2] === 'child') {
  process.send(_.range(0, 1000).map(unique));
} else {
  it('unique child', () => Promise.resolve(true));
}
