const current = require('../helper.js');
let config = require('../config.js');
const mkdirp = require('firost/mkdirp');
const emptyDir = require('firost/emptyDir');
const readJson = require('firost/readJson');

describe('helper', () => {
  const cachePath = '/tmp/netlify-minutes';
  beforeEach(async () => {
    current.__apiClient = null;
    config.clear();
  });
  describe('token', () => {
    it('should return the NETLIFY_AUTH_TOKEN variable if found', async () => {
      jest.spyOn(current, 'getEnvVar').mockReturnValue('token');
      const actual = current.token();
      expect(actual).toEqual('token');
    });
    it('should return false if not found', async () => {
      jest.spyOn(current, 'getEnvVar').mockReturnValue();
      const actual = current.token();
      expect(actual).toEqual(false);
    });
  });
  describe('hasToken', () => {
    it('should return true if has a token', async () => {
      jest.spyOn(current, 'token').mockReturnValue('token');
      const actual = current.hasToken();
      expect(actual).toEqual(true);
    });
    it('should return false if no token found', async () => {
      jest.spyOn(current, 'token').mockReturnValue(false);
      const actual = current.hasToken();
      expect(actual).toEqual(false);
    });
  });
  describe('apiClient', () => {
    it('should return a netlify API client with the token passed', async () => {
      jest.spyOn(current, '__NetlifyAPI').mockReturnValue('apiClient');
      jest.spyOn(current, 'token').mockReturnValue('token');
      const actual = current.apiClient();
      expect(current.__NetlifyAPI).toHaveBeenCalledWith('token');
      expect(actual).toEqual('apiClient');
    });
    it('should used a cached version on subsequent calls', async () => {
      jest.spyOn(current, '__NetlifyAPI').mockReturnValue('apiClient');
      jest.spyOn(current, 'token').mockReturnValue('token');

      current.apiClient();
      const actual = current.apiClient();

      expect(current.__NetlifyAPI).toHaveBeenCalledTimes(1);
      expect(actual).toEqual('apiClient');
    });
  });
  describe('cachePath', () => {
    it('should return null if caching not enabled', async () => {
      const actual = current.cachePath('methodName', { key: 'value' });
      expect(actual).toEqual(null);
    });
    it('should return a path to disk using the methodName and optionHash', async () => {
      config.set('cachePath', cachePath);
      jest.spyOn(current, '__hashMethod').mockReturnValue('abcdef');
      const actual = current.cachePath('methodName', { key: 'value' });
      expect(actual).toEqual(`${cachePath}/methodName/abcdef.json`);
    });
  });
  describe('api', () => {
    beforeEach(async () => {
      jest.spyOn(current, 'apiClient').mockReturnValue();
    });

    it('should call the API client with the method and options', async () => {
      const mockMethod = jest.fn().mockReturnValue('api response');
      current.apiClient.mockReturnValue({
        methodName: mockMethod,
      });

      const actual = await current.api('methodName', { key: 'value' });
      expect(mockMethod).toHaveBeenCalledWith({ key: 'value' });
      expect(actual).toEqual('api response');
    });
    describe('with caching enabled', () => {
      beforeEach(async () => {
        config.set('cachePath', cachePath);
        await mkdirp(cachePath);
        await emptyDir(cachePath);
      });
      it('should save the result in the cache location', async () => {
        jest.spyOn(current, '__hashMethod').mockReturnValue('abcdef');
        const mockMethod = jest.fn().mockReturnValue({ result: 'ok' });
        current.apiClient.mockReturnValue({
          methodName: mockMethod,
        });

        await current.api('methodName', { key: 'value' });
        const actual = await readJson(`${cachePath}/methodName/abcdef.json`);
        expect(actual).toHaveProperty('result', 'ok');
      });
      it('should read from the cache location on subsequent calls', async () => {
        jest.spyOn(current, '__hashMethod').mockReturnValue('abcdef');
        const mockMethod = jest.fn().mockReturnValue({ result: 'ok' });
        current.apiClient.mockReturnValue({
          methodName: mockMethod,
        });

        await current.api('methodName', { key: 'value' });
        mockMethod.mockReturnValue({ result: 'new result' });

        const actual = await current.api('methodName', { key: 'value' });
        expect(actual).toHaveProperty('result', 'ok');
      });
    });
  });
});
