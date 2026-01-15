name: vercel-deployer description: Deploys static HTML/CSS web pages to Vercel. Use this skill when the user asks to create a landing page, graph, report, or website and share it via a public link. It handles project creation, deployment, and domain aliasing.

Vercel Deployer Skill

This skill allows you to generate HTML content and deploy it immediately to Vercel using the user's opie.website domain.

Capabilities

Create & Deploy: Takes HTML content, creates a local project folder, and deploys it to Vercel.

Alias: Automatically attempts to assign a subdomain (e.g., project-name.opie.website).

Update: Can overwrite existing projects if the project name matches an existing one.

Usage Instructions for the Agent

When a user asks for a website or visual:

Generate the full HTML/CSS/JS content.

Determine a URL-safe project_slug (e.g., q1-sales-report).

Call the scripts/deploy.py script with the content and slug.

Return the final URL to the user.

Requirements

The vercel CLI must be installed on the host machine (npm i -g vercel).

The VERCEL_TOKEN environment variable must be set in the Clawdbot configuration or system environment.

The VERCEL_ORG_ID and VERCEL_PROJECT_ID are managed automatically by the script, but VERCEL_SCOPE (team ID) can be set via env var if needed.

Script Usage

Run the python script located in this skill's scripts/ directory.

python3 scripts/deploy.py --name "my-page-name" --content "<html>...</html>"


Tips

Always check if the deployment was successful by validating the JSON output from the script.

If the alias fails, provide the fallback *.vercel.app URL to the user.