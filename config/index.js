// config/index.js
'use strict'

const common = require('./components/common');
const clientConfig = require('./client.json');

module.exports = Object.assign({}, common, clientConfig)