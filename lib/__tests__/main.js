const current = require('../main');
const helper = require('../helper');
const config = require('../config');

describe('main', () => {
  describe('run', () => {
    beforeEach(async () => {
      config.clear();
      jest.spyOn(current, 'today').mockReturnValue('today');
      jest.spyOn(current, 'displayByDate').mockReturnValue();
    });
    it('should call byDate on todays date', async () => {
      await current.run();
      expect(current.displayByDate).toHaveBeenCalledWith('today');
    });
    it('should call byDate on the date passed in args', async () => {
      await current.run(['2020-05-04']);
      expect(current.displayByDate).toHaveBeenCalledWith('2020-05-04');
    });
    it('should enable caching if --cachePath is passed', async () => {
      await current.run(['--cachePath=/tmp/', '2020-05-04']);
      expect(current.displayByDate).toHaveBeenCalledWith('2020-05-04');
      const actual = config.get('cachePath');
      expect(actual).toEqual('/tmp/');
    });
  });
  describe('toMinutes', () => {
    it.each([
      // input | expected
      [75, '1mn15s'],
      [15, '15s'],
      [60, '1mn'],
      [61, '1mn01s'],
      [1, '01s'],
      [0, 'N/A'],
    ])('%s => %s', async (input, expected) => {
      const actual = current.toMinutes(input);
      expect(actual).toEqual(expected);
    });
  });
  describe('getAllSites', () => {
    it('should return list of all sites', async () => {
      jest.spyOn(helper, 'api').mockReturnValue([
        { name: 'site1', site_id: 'uuid-1', whatever: 'useless' },
        { name: 'site2', site_id: 'uuid-2' },
      ]);
      const actual = await current.getAllSites();
      expect(actual).toEqual([
        { name: 'site1', siteId: 'uuid-1' },
        { name: 'site2', siteId: 'uuid-2' },
      ]);
    });
  });
  describe('bySiteId', () => {
    it('should return a sorted list of deploys', async () => {
      jest.spyOn(helper, 'api').mockReturnValue([
        {
          created_at: '2020-05-01',
          id: 'id-chore',
          title: 'chore(bugs): Renovate stuff',
        },
        {
          created_at: '2020-05-02',
          deploy_time: 122,
          id: 'id-feat',
          title: 'feat(feature): Big update',
        },
        {
          created_at: '2020-05-04',
          deploy_time: 42,
          id: 'id-fix',
          title: 'fix(bugs): Fix stuff',
        },
      ]);
      const actual = await current.bySiteId('site-id');
      expect(helper.api).toHaveBeenCalledWith('listSiteDeploys', {
        site_id: 'site-id',
      });
      expect(actual).toEqual([
        {
          createdAt: '2020-05-02',
          time: 122,
          id: 'id-feat',
          title: 'feat(feature): Big update',
        },
        {
          createdAt: '2020-05-04',
          time: 42,
          id: 'id-fix',
          title: 'fix(bugs): Fix stuff',
        },
        {
          createdAt: '2020-05-01',
          time: 0,
          id: 'id-chore',
          title: 'chore(bugs): Renovate stuff',
        },
      ]);
    });
  });
  describe('byDateAndSiteId', () => {
    it('should return only deploys of the given date', async () => {
      jest.spyOn(current, 'bySiteId').mockReturnValue([
        { createdAt: '2020-05-04', title: 'ok' },
        { createdAt: '2019-05-04', title: 'bad' },
        { createdAt: '2020-05-04', title: 'ok too' },
      ]);
      const actual = await current.byDateAndSiteId('2020-05-04', 'site-id');
      expect(actual).toEqual([
        { createdAt: '2020-05-04', title: 'ok' },
        { createdAt: '2020-05-04', title: 'ok too' },
      ]);
    });
    it('should return [] if no deploys found', async () => {
      jest.spyOn(current, 'bySiteId').mockReturnValue([
        { createdAt: '2020-05-04', title: 'bad' },
        { createdAt: '2019-05-04', title: 'bad too' },
        { createdAt: '2020-05-04', title: 'bad as well' },
      ]);
      const actual = await current.byDateAndSiteId('1900-00-01', 'site-id');
      expect(actual).toEqual([]);
    });
  });
  describe('displayByDate', () => {
    it('should display deploys on all sites', async () => {
      jest.spyOn(current, 'getAllSites').mockReturnValue([
        { name: 'monsters', siteId: 'monsters-id' },
        { name: 'npcs', siteId: 'npcs-id' },
      ]);
      jest
        .spyOn(current, 'byDateAndSiteId')
        .mockImplementation((referenceDate, siteId) => {
          return [`deploy-${siteId}`];
        });
      jest.spyOn(current, 'displaySiteDeploys').mockReturnValue();

      await current.displayByDate('referenceDate');
      expect(current.byDateAndSiteId).toHaveBeenCalledWith(
        'referenceDate',
        'monsters-id'
      );
      expect(current.byDateAndSiteId).toHaveBeenCalledWith(
        'referenceDate',
        'npcs-id'
      );
      expect(current.displaySiteDeploys).toHaveBeenCalledWith({
        deploys: ['deploy-monsters-id'],
        name: 'monsters',
      });
      expect(current.displaySiteDeploys).toHaveBeenCalledWith({
        deploys: ['deploy-npcs-id'],
        name: 'npcs',
      });
    });
  });
});
