/* eslint-disable @typescript-eslint/no-var-requires */
var lib = require('./mappersmith')
var _process, defaultGateway

// Prevents webpack to load the nodejs processs polyfill
try {
  // eslint-disable-next-line no-eval
  _process = eval('typeof process === "object" ? process : undefined')
} catch (e) {} // eslint-disable-line no-empty

if (typeof XMLHttpRequest !== 'undefined') {
  // For browsers use XHR adapter
  defaultGateway = require('./gateway/xhr').default
} else if (typeof _process !== 'undefined') {
  // For node use HTTP adapter
  defaultGateway = require('./gateway/http').default
}

lib.configs.gateway = defaultGateway
module.exports = lib
