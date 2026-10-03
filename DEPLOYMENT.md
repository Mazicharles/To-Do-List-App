# Publish the shared demo

The React frontend and FastAPI API deploy together on Vercel. Hosted PostgreSQL stores shared tasks; local development still uses SQLite. No account or login is required for visitors. Everyone can change the same list.

## 1. Upload the deployment changes

In GitHub Desktop, commit the changes with summary `Prepare shared demo for Vercel`, then click **Push origin**.

## 2. Import into Vercel

Sign into https://vercel.com using GitHub. Choose **Add New → Project** and import **Mazicharles/To-Do-List-App**. Leave Root Directory at the repository root (do not select frontend). The repository config selects FastAPI and builds React. Deploy the project.

The page can load before a database is connected, but task requests return an explanatory error until DATABASE_URL is configured.

## 3. Connect the database

In the Vercel project, open **Storage**, create a **Neon Postgres** database from the marketplace, and connect it to this project. Review the plan and choose a free option if available; do not enable a paid plan unless you intend to pay.

The app expects an environment variable named **DATABASE_URL** containing the PostgreSQL connection string. If the integration creates a prefixed variable such as NEON_DATABASE_URL instead, add DATABASE_URL using that connection string in project **Settings → Environment Variables**. Enable it for Production and Preview. Use the pooled connection URL with SSL. Keep this value private; never paste it into GitHub or commit it.

Redeploy from the project's **Deployments** tab after adding the variable. The app creates its tasks table on the first API request. No SQL setup is required.

## 4. Check the public demo

Open the deployment URL. Confirm the shared-demo notice appears. Add two sample tasks, mark one complete, edit it, change their order, and refresh the page. Open the same link in another browser to confirm it sees the same tasks. Delete the sample tasks afterwards.

Local SQLite tasks are not uploaded automatically. The public demo begins with an empty list. Other visitors' changes refresh every ten seconds while you are not editing or saving.

If task requests fail, check DATABASE_URL and the Vercel function logs. Never expose the database connection string when sharing logs.

References: https://vercel.com/docs/frameworks/backend/fastapi and https://vercel.com/docs/storage
