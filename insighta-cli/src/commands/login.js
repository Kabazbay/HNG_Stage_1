// src/commands/login.js
// Implements: insighta login
//
// HOW CLI OAUTH LOGIN WORKS:
// 1. CLI calls GET /auth/github?client_type=cli to get the GitHub auth URL + state
// 2. CLI starts a tiny HTTP server on http://localhost:9876
// 3. CLI opens the user's browser to the GitHub auth URL
// 4. User authorizes on GitHub → GitHub redirects to the backend callback
// 5. Backend processes the OAuth, then redirects to http://localhost:9876/callback
//    with the tokens in the URL (for CLI) OR returns them as JSON
// 6. CLI's temp server catches the tokens, saves them, and shuts down
//
// ALTERNATIVE APPROACH (simpler, used here):
// Since the backend callback returns JSON for client_type=cli,
// we can't easily redirect back to the CLI. Instead:
// 1. CLI opens browser to backend's /auth/github?client_type=cli
// 2. Backend redirects to GitHub
// 3. GitHub calls back to backend
// 4. Backend returns a page with tokens that the user can see
// 5. CLI starts a temp server, backend redirects to it with tokens

const axios = require('axios');
const crypto = require('crypto');
const http = require('http');
const chalk = require('chalk');
const ora = require('ora');
const { API_BASE_URL, CALLBACK_PORT } = require('../config');
const { saveCredentials } = require('../utils/auth');

function registerLogin(program) {
  program
    .command('login')
    .description('Log in to Insighta Labs+ via GitHub')
    .action(async () => {
      const spinner = ora('Starting login flow...').start();

      try {
        // ── STEP 1: Get the GitHub auth URL from our backend ──
        spinner.text = 'Contacting server...';

        const response = await axios.get(`${API_BASE_URL}/auth/github`, {
          params: {
            client_type: 'cli',
          },
        });

        const { authUrl, state } = response.data.data;

        // ── STEP 2: Start a temporary local server to receive the callback ──
        spinner.text = 'Waiting for GitHub authorization...';

        const tokens = await new Promise((resolve, reject) => {
          const server = http.createServer(async (req, res) => {
            // Parse the URL to get query parameters
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

            if (url.pathname === '/callback') {
              const code = url.searchParams.get('code');
              const returnedState = url.searchParams.get('state');

              if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>Login Failed</h1><p>No authorization code received.</p>');
                reject(new Error('No authorization code received'));
                server.close();
                return;
              }

              try {
                // Forward the code to our backend's callback endpoint
                const tokenResponse = await axios.get(
                  `${API_BASE_URL}/auth/github/callback`,
                  {
                    params: { code, state: returnedState },
                    maxRedirects: 0, // Don't follow redirects
                    validateStatus: (status) => status < 500,
                  }
                );

                if (tokenResponse.data && tokenResponse.data.data) {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(`
                    <html>
                      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>✅ Login Successful!</h1>
                        <p>You can close this window and return to the terminal.</p>
                      </body>
                    </html>
                  `);
                  resolve(tokenResponse.data.data);
                } else {
                  res.writeHead(400, { 'Content-Type': 'text/html' });
                  res.end('<h1>Login Failed</h1><p>Could not get tokens from server.</p>');
                  reject(new Error('Failed to get tokens'));
                }
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>Login Failed</h1><p>Server error.</p>');
                reject(err);
              }

              // Give time for the response to be sent, then close
              setTimeout(() => server.close(), 1000);
            }
          });

          server.listen(CALLBACK_PORT, () => {
            // ── STEP 3: Open the browser ──
            // We need to modify the GitHub auth URL to redirect back to our local server
            // Actually, we need the backend to redirect to our local callback
            // Let's use a different approach: open the auth URL directly
            const open = require('open');
            open(authUrl);
          });

          // Timeout after 2 minutes
          setTimeout(() => {
            server.close();
            reject(new Error('Login timed out. Please try again.'));
          }, 120000);
        });

        // ── STEP 4: Save credentials ──
        saveCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          user: tokens.user,
        });

        spinner.succeed(chalk.green('Login successful!'));
        console.log(chalk.cyan(`\n  Welcome, ${tokens.user.username}!`));
        console.log(chalk.grey(`  Role: ${tokens.user.role}`));
        console.log(chalk.grey(`  Credentials saved to ~/.insighta/credentials.json\n`));

      } catch (error) {
        spinner.fail(chalk.red('Login failed'));
        if (error.code === 'ECONNREFUSED') {
          console.error(chalk.red('\n  Cannot connect to the server. Is the backend running?'));
          console.error(chalk.grey(`  Expected at: ${API_BASE_URL}\n`));
        } else {
          console.error(chalk.red(`\n  ${error.message}\n`));
        }
        process.exit(1);
      }
    });
}

module.exports = registerLogin;
