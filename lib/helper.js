const NetlifyAPI = require('netlify');
const path = require('path');
const writeJson = require('firost/lib/writeJson');
const readJson = require('firost/lib/readJson');
const exists = require('firost/lib/exists');
const nodeObjectHash = require('node-object-hash');
const config = require('./config.js');
module.exports = {
  /**
   * Returns an ENV var by name.
   * @param {string} key Name of the var
   * @returns {string} Value of the var
   **/
  getEnvVar(key) {
    return process.env[key];
  },
  /**
   * Returns the Netlify token saved in ENV
   * @returns {string} The Netlify token
   **/
  token() {
    return this.getEnvVar('NETLIFY_AUTH_TOKEN') || false;
  },
  /**
   * Check if a Netfliy token is available
   * @returns {boolean} True if a token is defined
   **/
  hasToken() {
    return !!this.token();
  },
  /**
   * Returns a Netlify API Client
   * Always returns the same instance
   * @returns {object} NetlifyAPI instance
   **/
  apiClient() {
    if (!this.__apiClient) {
      const token = this.token();
      this.__apiClient = this.__NetlifyAPI(token);
    }
    return this.__apiClient;
  },
  /**
   * Returns the path to save a specific API call response in cache
   * @param {string} methodName name of the method to call
   * @param {string} options Options of the method
   * @returns {string} Path to save the response
   **/
  cachePath(methodName, options = {}) {
    // Stop if caching not enabled
    const cacheBasePath = config.get('cachePath');
    if (!cacheBasePath) {
      return null;
    }

    const optionHash = this.__hashMethod(options);
    return path.resolve(cacheBasePath, methodName, `${optionHash}.json`);
  },
  /**
   * Call the Netlify API with the specified method and options
   * Saves request in cache if caching is enabled
   * @param {string} methodName Name of the method to call
   * @param {object} options Options to pass to the call
   * @returns {object} Data returned by the API
   **/
  async api(methodName, options) {
    const cachePath = this.cachePath(methodName, options);
    const isCachingEnabled = !!cachePath;
    if (isCachingEnabled && (await exists(cachePath))) {
      return await readJson(cachePath);
    }

    const client = this.apiClient();
    const response = await client[methodName](options);

    if (isCachingEnabled) {
      await writeJson(response, cachePath);
    }
    return response;
  },
  __NetlifyAPI(token) {
    return new NetlifyAPI(token);
  },
  __hashMethod: nodeObjectHash().hash,
};
