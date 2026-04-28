// src/commands/profiles.js
// Implements all profile-related CLI commands:
//   insighta profiles list [options]   → List profiles with filters
//   insighta profiles get <id>         → Get a single profile
//   insighta profiles search "query"   → Natural language search
//   insighta profiles create --name    → Create a profile (admin only)
//   insighta profiles export --format  → Export profiles as CSV

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const apiClient = require('../utils/api');
const { loadCredentials } = require('../utils/auth');
const { displayProfilesTable, displayProfileDetail, displayError } = require('../utils/display');

function requireAuth() {
  const creds = loadCredentials();
  if (!creds) {
    console.error(chalk.red('\n  You are not logged in. Run: insighta login\n'));
    process.exit(1);
  }
  return creds;
}

function registerProfiles(program) {
  // Create the "profiles" command group
  const profiles = program
    .command('profiles')
    .description('Manage and query profiles');

  // ═══════════════════════════════════════════════
  // insighta profiles list [options]
  // ═══════════════════════════════════════════════
  profiles
    .command('list')
    .description('List profiles with optional filters')
    .option('--gender <gender>', 'Filter by gender (male/female)')
    .option('--country <country_id>', 'Filter by country code (e.g., NG, US)')
    .option('--age-group <group>', 'Filter by age group (child/teenager/adult/senior)')
    .option('--min-age <age>', 'Minimum age', parseInt)
    .option('--max-age <age>', 'Maximum age', parseInt)
    .option('--sort-by <field>', 'Sort by field (age/created_at/gender_probability)')
    .option('--order <order>', 'Sort order (asc/desc)', 'asc')
    .option('--page <page>', 'Page number', parseInt, 1)
    .option('--limit <limit>', 'Results per page', parseInt, 10)
    .action(async (options) => {
      requireAuth();
      const spinner = ora('Fetching profiles...').start();

      try {
        // Build query parameters from the CLI flags
        const params = {};
        if (options.gender) params.gender = options.gender;
        if (options.country) params.country_id = options.country;
        if (options.ageGroup) params.age_group = options.ageGroup;
        if (options.minAge) params.min_age = options.minAge;
        if (options.maxAge) params.max_age = options.maxAge;
        if (options.sortBy) params.sort_by = options.sortBy;
        if (options.order) params.order = options.order;
        if (options.page) params.page = options.page;
        if (options.limit) params.limit = options.limit;

        const response = await apiClient.get('/api/v1/profiles', { params });
        spinner.stop();

        displayProfilesTable(response.data.data, response.data.pagination);
        console.log('');

      } catch (error) {
        spinner.fail('Failed to fetch profiles');
        displayError(error);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════
  // insighta profiles get <id>
  // ═══════════════════════════════════════════════
  profiles
    .command('get <id>')
    .description('Get a single profile by ID')
    .action(async (id) => {
      requireAuth();
      const spinner = ora('Fetching profile...').start();

      try {
        const response = await apiClient.get(`/api/v1/profiles/${id}`);
        spinner.stop();

        console.log(chalk.bold.cyan('\n  Profile Details\n'));
        displayProfileDetail(response.data.data);
        console.log('');

      } catch (error) {
        spinner.fail('Failed to fetch profile');
        displayError(error);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════
  // insighta profiles search "query"
  // ═══════════════════════════════════════════════
  profiles
    .command('search <query>')
    .description('Search profiles using natural language (e.g., "young males from nigeria")')
    .option('--page <page>', 'Page number', parseInt, 1)
    .option('--limit <limit>', 'Results per page', parseInt, 10)
    .action(async (query, options) => {
      requireAuth();
      const spinner = ora(`Searching: "${query}"...`).start();

      try {
        const params = {
          q: query,
          page: options.page,
          limit: options.limit,
        };

        const response = await apiClient.get('/api/v1/profiles/search', { params });
        spinner.stop();

        console.log(chalk.bold.cyan(`\n  Search Results for: "${query}"\n`));
        displayProfilesTable(response.data.data, response.data.pagination);
        console.log('');

      } catch (error) {
        spinner.fail('Search failed');
        displayError(error);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════
  // insighta profiles create --name "Name"
  // ═══════════════════════════════════════════════
  profiles
    .command('create')
    .description('Create a new profile (admin only)')
    .requiredOption('--name <name>', 'Name to create a profile for')
    .action(async (options) => {
      requireAuth();
      const spinner = ora(`Creating profile for "${options.name}"...`).start();

      try {
        const response = await apiClient.post('/api/v1/profiles', {
          name: options.name,
        });
        spinner.stop();

        const isNew = response.status === 201;
        if (isNew) {
          console.log(chalk.green('\n  ✔ Profile created successfully!\n'));
        } else {
          console.log(chalk.yellow('\n  ℹ Profile already exists.\n'));
        }

        displayProfileDetail(response.data.data);
        console.log('');

      } catch (error) {
        spinner.fail('Failed to create profile');
        displayError(error);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════
  // insighta profiles export --format csv [filters]
  // ═══════════════════════════════════════════════
  profiles
    .command('export')
    .description('Export profiles as CSV')
    .requiredOption('--format <format>', 'Export format (csv)')
    .option('--gender <gender>', 'Filter by gender')
    .option('--country <country_id>', 'Filter by country code')
    .option('--age-group <group>', 'Filter by age group')
    .option('--min-age <age>', 'Minimum age', parseInt)
    .option('--max-age <age>', 'Maximum age', parseInt)
    .option('--sort-by <field>', 'Sort by field')
    .option('--order <order>', 'Sort order (asc/desc)')
    .action(async (options) => {
      requireAuth();
      const spinner = ora('Exporting profiles...').start();

      try {
        const params = { format: options.format };
        if (options.gender) params.gender = options.gender;
        if (options.country) params.country_id = options.country;
        if (options.ageGroup) params.age_group = options.ageGroup;
        if (options.minAge) params.min_age = options.minAge;
        if (options.maxAge) params.max_age = options.maxAge;
        if (options.sortBy) params.sort_by = options.sortBy;
        if (options.order) params.order = options.order;

        const response = await apiClient.get('/api/v1/profiles/export', {
          params,
          responseType: 'text', // Get raw text, not parsed JSON
        });

        // Save to current working directory
        const filename = `profiles_${Date.now()}.csv`;
        const filepath = path.join(process.cwd(), filename);
        fs.writeFileSync(filepath, response.data);

        spinner.succeed(chalk.green(`Exported to ${filename}`));
        console.log(chalk.grey(`  Location: ${filepath}\n`));

      } catch (error) {
        spinner.fail('Export failed');
        displayError(error);
        process.exit(1);
      }
    });
}

module.exports = registerProfiles;
