# Insighta CLI

A command-line tool for interacting with the Insighta Labs+ Profile Intelligence System.

## Installation

```bash
# Clone and install globally
git clone <repo-url>
cd insighta-cli
npm install
npm install -g .

# Now you can use "insighta" from anywhere
insighta --help
```

## Authentication

```bash
# Log in via GitHub OAuth
insighta login

# Check who you're logged in as
insighta whoami

# Log out
insighta logout
```

Credentials are stored at `~/.insighta/credentials.json`.

## Profile Commands

```bash
# List all profiles
insighta profiles list

# Filter by gender
insighta profiles list --gender male

# Filter by country and age group
insighta profiles list --country NG --age-group adult

# Filter by age range
insighta profiles list --min-age 25 --max-age 40

# Sort results
insighta profiles list --sort-by age --order desc

# Pagination
insighta profiles list --page 2 --limit 20

# Get a single profile
insighta profiles get <profile-id>

# Natural language search
insighta profiles search "young males from nigeria"

# Create a profile (admin only)
insighta profiles create --name "Harriet Tubman"

# Export as CSV
insighta profiles export --format csv

# Export with filters
insighta profiles export --format csv --gender male --country NG
```

## Token Handling

- Access tokens expire after 15 minutes
- The CLI automatically refreshes tokens when they expire
- If refresh fails, you'll be prompted to run `insighta login` again
- Tokens are stored locally at `~/.insighta/credentials.json`

## Configuration

Set the `INSIGHTA_API_URL` environment variable to point to a different backend:

```bash
export INSIGHTA_API_URL=https://your-backend.vercel.app
```
