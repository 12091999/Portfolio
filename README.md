# Portfolio Landing Page

A single-page portfolio with a working contact form backend.

- **Frontend:** plain HTML, CSS, JS (`public/`), responsive with dark mode
- **Backend:** Node.js + Express (`server.js`)
- **Storage:** SQLite (`data.db`, created automatically)
- **Email:** Nodemailer notification on every new message (optional)
- **Protection:** Helmet security headers, rate limiting (5 messages / 15 min per IP), honeypot spam field, server-side validation

## Run it

```bash
npm install
cp .env.example .env     # then edit with your SMTP details
npm start
```

Open http://localhost:3000

## Email notifications

Fill in the `SMTP_*` values in `.env`. For Gmail, enable 2-step verification and create an
[App Password](https://myaccount.google.com/apppasswords) to use as `SMTP_PASS`.
If SMTP is not configured, messages are still saved to the database and a warning is logged.

## API

| Method | Path           | Description                          |
| ------ | -------------- | ------------------------------------ |
| GET    | `/api/health`  | Health check                         |
| POST   | `/api/contact` | `{ name, email, subject?, message }` |

## View saved messages

```bash
sqlite3 data.db "SELECT id, created_at, name, email, message FROM messages ORDER BY id DESC;"
```

## Customize

Replace the placeholder name, copy and project cards in `public/index.html`.
Colors live in the `:root` variables at the top of `public/style.css`.

## Deploy

Any Node host works (Render, Railway, Fly.io, a VPS). Set the env vars from `.env.example`
and make sure `data.db` lives on persistent storage (set `DB_PATH`).
