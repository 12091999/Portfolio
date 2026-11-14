# Portfolio Landing Page

A responsive portfolio site with a contact form. The frontend is static HTML, CSS, and JavaScript in `public/`; the Express app handles the contact API.

## Requirements

- Node.js 22.x
- A Turso database for storing contact messages

## Configure the database

Create a database and auth token in Turso. Set these environment variables locally in `.env` and in the Vercel project's **Settings → Environment Variables**:

```env
TURSO_DATABASE_URL=libsql://your-database-name-your-username.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

The messages table is created automatically on the first contact form submission. The site can still be deployed without these values, but the contact form will respond that its database is not configured until both values are added.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

Then open `http://localhost:3000`. Add the Turso credentials to `.env` to enable message storage. SMTP settings are optional; if configured, Nodemailer sends an email notification after storing a message.

## Migrate messages from the old local database

If your original project has a `data.db` file, keep it in the project folder. After installing dependencies and setting Turso credentials in `.env`, run:

```bash
npm run migrate:data
```

The migration copies only rows in the `messages` table, preserves their IDs, and can be run again safely. Keep the original `data.db` as a backup until you have confirmed the migration.

## Deploy to Vercel

The Express app is exported from `server.js` for Vercel's Express runtime. Static files remain in `public/`, and the package pins Node.js to `22.x` to avoid native SQLite build issues.

1. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the Vercel project environment variables.
2. Push the updated project to the GitHub repository connected to Vercel, or deploy with the Vercel CLI.
3. Confirm the deployment, then visit `/api/health`. A successful response includes `"database":"connected"`.

Optional SMTP variables are listed in `.env.example`. Do not commit `.env` or database files; they are ignored by Git and Vercel.
