// src/commands/whoami.js
// Implements: insighta whoami
//
// Calls GET /auth/me to show the current logged-in user's info.

const chalk = require('chalk');
const ora = require('ora');
const apiClient = require('../utils/api');
const { loadCredentials } = require('../utils/auth');
const { displayUserInfo, displayError } = require('../utils/display');

function registerWhoami(program) {
  program
    .command('whoami')
    .description('Show current logged-in user info')
    .action(async () => {
      const creds = loadCredentials();

      if (!creds) {
        console.error(chalk.red('\n  You are not logged in. Run: insighta login\n'));
        process.exit(1);
      }

      const spinner = ora('Fetching user info...').start();

      try {
        const response = await apiClient.get('/auth/me');
        spinner.stop();

        console.log(chalk.bold.cyan('\n  Current User\n'));
        displayUserInfo(response.data.data);
        console.log('');

      } catch (error) {
        spinner.fail('Failed to fetch user info');
        displayError(error);
        process.exit(1);
      }
    });
}

module.exports = registerWhoami;
