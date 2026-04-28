#!/usr/bin/env node
// bin/insighta.js
// This is the ENTRY POINT for the CLI tool.
// The "#!/usr/bin/env node" line at the top tells the OS to run this file with Node.js.
//
// After running "npm install -g ." in this directory, typing "insighta" in ANY
// terminal will execute this file.
//
// This file sets up the command structure using Commander.js:
//   insighta login          → GitHub OAuth login
//   insighta logout         → Clear saved tokens
//   insighta whoami         → Show current user info
//   insighta profiles list  → List profiles with filters
//   insighta profiles get   → Get a single profile
//   insighta profiles search → Natural language search
//   insighta profiles create → Create a profile (admin only)
//   insighta profiles export → Export profiles as CSV

const { Command } = require('commander');
const loginCommand = require('../src/commands/login');
const logoutCommand = require('../src/commands/logout');
const whoamiCommand = require('../src/commands/whoami');
const profilesCommand = require('../src/commands/profiles');

// Create the main program
const program = new Command();

program
  .name('insighta')
  .description('Insighta Labs+ CLI — Manage and query profiles from the terminal')
  .version('1.0.0');

// Register commands
loginCommand(program);
logoutCommand(program);
whoamiCommand(program);
profilesCommand(program);

// Parse command-line arguments and execute the matching command
program.parse(process.argv);
