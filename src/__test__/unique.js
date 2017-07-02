const _ = require('lodash');
const unique = require('../unique');

process.send(_.range(0, 1000).map(unique));
