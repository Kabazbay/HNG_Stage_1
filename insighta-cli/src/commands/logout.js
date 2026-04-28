// src/commands/logout.js
// Implements: insighta logout
//
// What it does:
// 1. Calls POST /auth/logout on the backend (to invalidate the refresh token)
// 2. Deletes the local credentials file (~/.insighta/credentials.json)

const chalk = require('chalk');
const ora = require('ora');
const apiClient = require('../utils/api');
const { clearCredentials, loadCredentials } = require('../utils/auth');

function registerLogout(program) {
  program
    .command('logout')
    .description('Log out of Insighta Labs+')
    .action(async () => {
      const spinner = ora('Logging out...').start();

      try {
        const creds = loadCredentials();

        if (!creds) {
          spinner.info(chalk.yellow('You are not logged in.'));
          return;
        }

        // Try to tell the backend to invalidate the refresh token
        // If this fails (e.g., server unreachable), we still clear local creds
        try {
          await apiClient.post('/auth/logout');
        } catch (error) {
          // Ignore — we'll clear local creds regardless
        }

        // Clear local credentials
        clearCredentials();

        spinner.succeed(chalk.green('Logged out successfully.'));
        console.log(chalk.grey('  Credentials removed from ~/.insighta/credentials.json\n'));

      } catch (error) {
        spinner.fail(chalk.red('Logout error'));
        // Still clear local credentials even if server call fails
        clearCredentials();
        console.log(chalk.grey('  Local credentials cleared.\n'));
      }
    });
}

module.exports = registerLogout;
