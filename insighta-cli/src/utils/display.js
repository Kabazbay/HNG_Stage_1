// src/utils/display.js
// This file provides helper functions for displaying data in the terminal.
// It creates nice-looking tables, colored text, and loading spinners.

const chalk = require('chalk');
const Table = require('cli-table3');

// ──────────────────────────────────────────────
// Display a profile list as a formatted table
// ──────────────────────────────────────────────
function displayProfilesTable(profiles, pagination) {
  if (!profiles || profiles.length === 0) {
    console.log(chalk.yellow('\nNo profiles found.\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Gender'),
      chalk.cyan('Age'),
      chalk.cyan('Age Group'),
      chalk.cyan('Country'),
    ],
    colWidths: [40, 20, 10, 8, 12, 10],
    style: { head: [], border: ['grey'] },
  });

  for (const p of profiles) {
    table.push([
      p.id || '',
      p.name || '',
      p.gender || '',
      p.age != null ? String(p.age) : '',
      p.age_group || '',
      p.country_id || '',
    ]);
  }

  console.log(table.toString());

  // Show pagination info
  if (pagination) {
    console.log(
      chalk.grey(
        `\nPage ${pagination.page} of ${pagination.totalPages} | ` +
        `Total: ${pagination.total} | ` +
        `Showing: ${profiles.length}`
      )
    );
  }
}

// ──────────────────────────────────────────────
// Display a single profile in detail
// ──────────────────────────────────────────────
function displayProfileDetail(profile) {
  const table = new Table({
    style: { head: [], border: ['grey'] },
  });

  table.push(
    { [chalk.cyan('ID')]: profile.id },
    { [chalk.cyan('Name')]: profile.name },
    { [chalk.cyan('Gender')]: `${profile.gender} (${(profile.gender_probability * 100).toFixed(1)}%)` },
    { [chalk.cyan('Age')]: `${profile.age} (${profile.age_group})` },
    { [chalk.cyan('Country')]: `${profile.country_name || 'N/A'} (${profile.country_id || 'N/A'})` },
    { [chalk.cyan('Country Prob.')]: profile.country_probability != null ? `${(profile.country_probability * 100).toFixed(1)}%` : 'N/A' },
    { [chalk.cyan('Created')]: profile.created_at },
  );

  console.log(table.toString());
}

// ──────────────────────────────────────────────
// Display user info (for whoami)
// ──────────────────────────────────────────────
function displayUserInfo(user) {
  const table = new Table({
    style: { head: [], border: ['grey'] },
  });

  table.push(
    { [chalk.cyan('Username')]: user.username },
    { [chalk.cyan('Email')]: user.email || 'N/A' },
    { [chalk.cyan('Role')]: user.role === 'admin' ? chalk.green(user.role) : chalk.blue(user.role) },
    { [chalk.cyan('Member Since')]: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' },
    { [chalk.cyan('Last Login')]: user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'N/A' },
  );

  console.log(table.toString());
}

// ──────────────────────────────────────────────
// Display an error message
// ──────────────────────────────────────────────
function displayError(error) {
  if (error.response) {
    // Server responded with an error
    const msg = error.response.data?.message || error.response.statusText;
    console.error(chalk.red(`\n✖ Error: ${msg}\n`));
  } else if (error.code === 'ECONNREFUSED') {
    console.error(chalk.red('\n✖ Cannot connect to the server. Is the backend running?\n'));
  } else {
    console.error(chalk.red(`\n✖ Error: ${error.message}\n`));
  }
}

module.exports = {
  displayProfilesTable,
  displayProfileDetail,
  displayUserInfo,
  displayError,
};
