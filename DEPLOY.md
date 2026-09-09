# Deploying to Sevalla

This app is a standard Next.js + PostgreSQL app — Sevalla can build it directly from
a GitHub repo with no Dockerfile needed (it auto-detects Node.js apps via Nixpacks).

## 1. Push to GitHub

Create a new (private) GitHub repo and push this project to it:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Create a Postgres database on Sevalla

In the Sevalla dashboard: **Databases → Add database → PostgreSQL**. Once it's
provisioned, copy the internal connection string it gives you.

## 3. Create the app on Sevalla

**Application Hosting → Add application**, pick the GitHub repo you just pushed, and
enable automatic deploys on push. Sevalla should detect it as a Node.js app and use
`npm install` / `npm run build` / `npm start` automatically — that's all this project
needs (no custom build/start command required).

## 4. Set environment variables

In the app's settings, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Postgres connection string from step 2 |
| `APP_PASSCODE` | Whatever passcode you want to gate the app with |
| `SESSION_SECRET` | A random string — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

See `.env.example` for the shape of these.

## 5. Deploy

Trigger a deploy (or just push to `main` again). On boot, `npm start` runs
`prisma migrate deploy` before starting the server, so your database schema is
created/updated automatically — no manual migration step needed, on this deploy or
any future one after you change `prisma/schema.prisma`.

## 6. Open it on her iPhone

Visit the app's Sevalla URL in Safari, enter the passcode, then use the Share sheet →
**Add to Home Screen**. It'll appear as a normal app icon and open full-screen.

## Ongoing changes

Whenever you change `prisma/schema.prisma`, run `npx prisma migrate dev --name <description>`
locally first to generate the migration file, commit it, then push — Sevalla will apply
it automatically on the next deploy via the `prisma migrate deploy` step above.
