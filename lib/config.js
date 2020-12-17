const _ = require('golgoth/lodash');
module.exports = {
  __config: {},
  clear() {
    this.__config = {};
  },
  get(key) {
    return _.get(this.__config, key);
  },
  set(key, value) {
    _.set(this.__config, key, value);
  },
};
