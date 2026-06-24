# Vercel Web App Deployment Guide

This document provides step-by-step instructions for deploying the TrendScout web app to Vercel.

## Prerequisites

### 1. Vercel Account
- Create a [Vercel account](https://vercel.com/signup)
- Install the [Vercel CLI](https://vercel.com/docs/cli) globally:
  ```bash
  npm i -g vercel
  ```

### 2. GitHub Repository Setup
- Ensure the repo has the following GitHub **variables** (Settings → Actions → Variables and secrets → Actions):
  - `VERCEL_WEB_PROJECT_ID` (Vercel project ID)
  - `VERCEL_WEB_PROJECT_ID_PROD` (optional, for production)

- Ensure the repo has the following GitHub **secrets** (Settings → Actions → Variables and secrets → Actions):
  - `VERCEL_TOKEN` (Vercel personal access token)
  - `VERCEL_ORG_ID` (V orgs)

### 3. Local Development Setup
```bash
pnpm install
pnpm local:dev    # starts Postgres + Redis + API + web locally
```

## Step 1: Create Vercel Project

1. Log in to Vercel CLI:
   ```bash
   vercel login
   ```

2. Create a new project:
   ```bash
   vercel create
   ```
   - Select "Create a new project"
   - Name: `trendscout-web`
   - Framework: "Vite"
   - Root directory: `apps/web`
   - Select "Yes, I want to create a Vercel project in the current directory"

3. The command will output:
   ```
   > Success! Created a new project at /path/to/repo/apps/web.
   > Your project is now linked to https://your-project.vercel.app.
   > Your project ID is: <project-id>
   ```

4. Set the project ID in GitHub variables:
   ```bash
   gh variable set VERCEL_WEB_PROJECT_ID --body <project-id>
   ```

## Step 2: Configure Vercel Environment Variables

In the Vercel dashboard (https://vercel.com/dashboard), navigate to your project:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Variable | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://your-api-domain.vercel.app` | Replace with your k3s API URL |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase instance URL |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_your_key` | Your Supabase anon key |

**Important**: Set these variables for both **Development** and **Production** environments.

## Step 3: Update GitHub Workflow

The GitHub workflow already has a Vercel deployment job (`vercel-web`). Ensure it has the correct permissions:

1. Go to **Settings** → **Actions** → **General** → **Workflow permissions**
2. Set **Workflow permissions** to "Write permissions"

## Step 4: Trigger Vercel Deployment

Push changes to the `staging` branch to trigger the Vercel deployment:

```bash
git checkout staging
git push origin staging
```

The GitHub workflow will:

1. Build the API and deploy to k3s
2. Deploy the web app to Vercel (staging)
3. Wait for ArgoCD sync

## Step 5: Verify Deployment

After the workflow completes, visit your Vercel staging URL:

```
https://your-project.vercel.app
```

The web app should:

1. Load without errors
2. Authenticate with Supabase
3. Fetch reports from the API
4. Display the dashboard

## Troubleshooting

### Vercel Build Errors

If the Vercel build fails:

1. Check the Vercel logs in the GitHub Actions workflow run
2. Common issues:
   - Missing `pnpm install` in `vercel.json`
   - Incorrect `buildCommand` for monorepo setup
   - Missing dependencies in `apps/web/package.json`

### Environment Variables

If the app can't connect to the API:

1. Verify the `VITE_API_URL` is correct
2. Check if the API is accessible from Vercel (CORS, firewall)
3. Ensure the API URL includes the correct protocol (`https://`)

### Local Development

If you're testing locally with the Vercel CLI:

```bash
cd apps/web
vercel dev
```

This will run the web app locally with Vercel's development server.

## Production Deployment

For production deployment, update the GitHub workflow to use the `main` branch:

1. In `.github/workflows/deploy-staging.yml`, change:
   ```yaml
   on:
     push:
       branches: [staging]
   ```
   to:
   ```yaml
   on:
     push:
       branches: [main]
   ```

2. Update the job name from "Deploy staging" to "Deploy production"
3. Update the ArgoCD app name to point to production
4. Update the Vercel job to use `environment=preview` instead of `production`

## Important Notes

1. **API URL**: The `VITE_API_URL` should point to your deployed API, not localhost
2. **Environment Variables**: Keep these in sync between local development and production
3. **Secrets Management**: Use GitHub secrets for sensitive values
4. **CI/CD**: The existing GitHub workflow handles both API and web deployment
5. **Monitoring**: Monitor Vercel logs and analytics for performance issues

## Quick Reference Commands

```bash
# Local development
pnpm local:dev

# Build and deploy to Vercel (staging)
git checkout staging
git push origin staging

# Check Vercel deployment status
vercel ls

# Open Vercel logs
vercel logs
```

## Support

If you encounter issues:

1. Check the GitHub Actions workflow logs
2. Review the Vercel dashboard for deployment errors
3. Consult the Vercel documentation for monorepo setup
4. Check the TrendScout documentation for known issues

## License

This document is part of the TrendScout project and is licensed under the MIT License.