const dayjs = require('golgoth/lib/dayjs');
const _ = require('golgoth/lib/lodash');
const pMap = require('golgoth/lib/pMap');
const helper = require('./helper.js');
const chalk = require('golgoth/lib/chalk');
const minimist = require('minimist');
const config = require('./config.js');
const spinner = require('firost/spinner');
module.exports = {
  /**
   * Display builds of the specified date
   * @param {string} cliArgs Args passed to the CLI. Expected first arg to be
   * date in YYYY-MM-DD format
   **/
  async run(cliArgs = []) {
    // Enable caching is --cachePath= is passed
    const args = minimist(cliArgs, {
      boolean: true,
    });
    config.set('cachePath', args.cachePath);

    const referenceDate = _.first(args._) || this.today();
    await this.displayByDate(referenceDate);
  },
  /**
   * Returns today's date in YYYY-MM-DD format
   * @returns {string} Today's date in YYYY-MM-DD format
   **/
  today() {
    return dayjs().format('YYYY-MM-DD');
  },
  /**
   * Convert a time in seconds to a XXmnYYs string
   * @param {number} time Time in second
   * @returns {string} String ready for display
   **/
  toMinutes(time) {
    if (time === 0) {
      return 'N/A';
    }
    const intMinutes = Math.floor(time / 60);
    const intSeconds = time % 60;
    const strMinutes = intMinutes ? `${intMinutes}mn` : '';
    const strSeconds = intSeconds ? `${_.padStart(intSeconds, 2, '0')}s` : '';
    return `${strMinutes}${strSeconds}`;
  },
  /**
   * Returns an array of all sites
   * @returns {Array} Array of objects with .name and .id for each site
   **/
  async getAllSites() {
    const response = await helper.api('listSites');
    return _.map(response, (site) => {
      return {
        name: site.name,
        siteId: site.site_id,
      };
    });
  },
  /**
   * Returns a sorted list of deploys of a specific site
   * @param {string} siteId Id of the website
   * @returns {Array} List of deploys
   **/
  async bySiteId(siteId) {
    const response = await helper.api('listSiteDeploys', { site_id: siteId });
    return _.chain(response)
      .map((deploy) => {
        const time = _.get(deploy, 'deploy_time') || 0;
        return {
          createdAt: deploy.created_at,
          time,
          id: deploy.id,
          title: deploy.title,
        };
      })
      .sortBy(['time'])
      .reverse()
      .value();
  },
  /**
   * Return deploys of a specific date and siteId
   * @param {string} referenceDate Date in YYYY-MM-DD format
   * @param {string} siteId Site id
   * @returns {Array} List of deploys for this date
   **/
  async byDateAndSiteId(referenceDate, siteId) {
    const allDeploys = await this.bySiteId(siteId);
    return _.filter(allDeploys, ({ createdAt }) => {
      return _.startsWith(createdAt, referenceDate);
    });
  },
  /**
   * Display all deploys of a given date
   * @param {string} referenceDate Date in YYYY-MM-DD format
   * */
  async displayByDate(referenceDate) {
    // There is no endpoint to get all deploys of a given day, so instead we
    // will get the list of sites, all deploys for each site and keep only the
    // deploys of the specified day

    let progress = spinner();
    progress.tick('Fetching all sites...');
    const allSites = await this.getAllSites();
    const siteCount = allSites.length;
    progress.success(`${siteCount} websites found`);

    progress = spinner(siteCount);
    const allSiteDeploys = await pMap(allSites, async ({ name, siteId }) => {
      const deploys = await this.byDateAndSiteId(referenceDate, siteId);
      progress.tick(`Checking for deploys of ${name}`);
      return { name, deploys };
    });
    progress.success('All deploys checked');

    _.each(allSiteDeploys, (siteDeploy) => {
      this.displaySiteDeploys(siteDeploy);
    });
  },
  /**
   * Display deploy information for one site
   * @param {object} siteDeploy Site deploy object, with .name and .deploys keys
   **/
  displaySiteDeploys(siteDeploy) {
    const { name, deploys } = siteDeploy;
    if (_.isEmpty(deploys)) {
      return;
    }

    const totalTime = _.chain(deploys).map('time').sum().value();
    const displayTotalTime = this.toMinutes(totalTime);
    console.info('');
    console.info(`${name} (${displayTotalTime})`);
    _.each(deploys, ({ time, title }) => {
      const displayTime = this.toMinutes(time);
      const color = this.getColor(time);
      console.info(color(`${displayTime}: ${title}`));
    });
  },
  /**
   * Pick a color based on the time consumed
   * Values are arbitrary
   * @param {number} time Time in second
   * @returns {Function} Function to call to color the line
   **/
  getColor(time) {
    if (time > 120) return chalk.red;
    if (time > 60) return chalk.blueBright;
    if (time === 0) return chalk.gray;
    return chalk.green;
  },
};
