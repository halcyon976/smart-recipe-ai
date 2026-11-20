# Smart Recipe AI

A beginner-friendly recipe sharing app built with Express, EJS, Bootstrap, vanilla JavaScript, and PostgreSQL. The app includes account login, recipe sharing, photo uploads, favorites, view history, and a server-side Gemini cooking helper. Without a Gemini key, the helper returns useful sample responses.

## Requirements

- Node.js 18 or newer (the Gemini service uses the built-in `fetch` API)
- PostgreSQL 13 or newer

## Installation

1. Create a PostgreSQL database named `smart_recipe_ai` (or choose another name).
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SESSION_SECRET`, and optionally `GEMINI_API_KEY` and `PORT`.
3. Install packages with `npm install`.
4. Create the tables with `psql -d smart_recipe_ai -f schema.sql`.
5. Add sample data with `npm run seed`.
6. Start the server with `npm run dev` during development or `npm start` normally.
7. Visit `http://localhost:3000` (or your configured port).

`npm run seed` also applies `schema.sql` before adding sample content. Sample login: `ava@example.com` / `recipe123`; `noah@example.com` / `recipe123`. Change demo passwords before using any shared deployment.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret used to sign session cookies; set a long random value |
| `GEMINI_API_KEY` | Optional server-only Google Gemini API key |
| `PORT` | Optional web server port (defaults to 3000) |
| `DATABASE_SSL` | Optional: set to `true` for hosted PostgreSQL requiring SSL |

## Database

`schema.sql` creates `users`, `recipes`, `favorites`, `recipe_history`, and `chat_messages`, with primary keys, foreign keys, and useful indexes. Session data is stored in PostgreSQL using `connect-pg-simple`. The schema and models use plain SQL through `pg`.

## Features

- Signup, login, logout, password hashing, and protected pages
- Search recipes by text/ingredient with cuisine, difficulty, and cooking-time filters
- Recipe creation, editing, deletion, and image upload (5 MB maximum; JPG, PNG, WebP, GIF)
- Personal recipes, saved favorites, profile editing, and recently viewed recipes
- Gemini recipe generation and cooking chat through backend-only API endpoints
- Helpful mock AI responses when `GEMINI_API_KEY` is unset
- Responsive Bootstrap layouts and empty states

## Security notes

- Passwords are stored as bcrypt hashes; SQL queries use parameters; recipe edits/deletes are limited to the owning account.
- Session contents live server-side in PostgreSQL. The browser receives only an opaque session cookie. Production requires `DATABASE_URL` and a random `SESSION_SECRET` of at least 32 characters, and uses an HTTPS-only `__Host-` cookie.
- Browser form changes require a session CSRF token. Login, signup, AI, and photo upload requests have basic per-process rate limits. Helmet supplies security headers and a content policy.
- Uploads are limited to 5 MB and checked against image file signatures. Uploaded recipe photos are public files, so do not upload private pictures.
- Chat messages are stored in PostgreSQL. Gemini receives the cooking question or ingredient list. With Google’s free API tier, prompts may be used to improve Google products; do not submit private information.
- This is a college project, not a formal security-reviewed production service. It has not been load-tested. Before serving real users, configure HTTPS, backups, a production database, durable image storage, account recovery/deletion policies, and centralized rate-limit storage if using multiple app instances.

## Hosting checklist

1. Keep `.env` out of Git. Set `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`, and `GEMINI_API_KEY` in the hosting provider's secret/environment settings.
2. Use an HTTPS-enabled Node host and a managed PostgreSQL database. The production session cookie requires HTTPS.
3. Run `schema.sql` once against the hosted database, then run `npm run seed` only if demo accounts and sample recipes are wanted.
4. Move uploaded images to persistent object storage or another durable shared filesystem. The current `public/uploads/` folder is suitable for local development only; many free app hosts erase local files on restart or redeploy.
5. Check the host’s database retention, backups, free-tier limits, and Gemini API quota before sharing the public link.

## Project structure

`app.js` configures Express. `routes/` maps URLs, `controllers/` handles requests, `models/` contains SQL operations, `db/` connects PostgreSQL, `middleware/` provides authentication and uploads, `services/` contains Gemini integration, and `views/` contains EJS pages and shared layouts. Static files and uploaded images live in `public/`.

## Screenshots

Add screenshots of the home page, recipe listing, and AI tools here.

## Password reset email setup

Password recovery uses a one-time random token stored as a SHA-256 hash and expires after 30 minutes. Configure APP_BASE_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in the environment. Apply the updated schema.sql to the database to create password_reset_tokens. Never commit SMTP credentials. Password reset cannot send links until a working SMTP account is configured.
