# Fitness Buddy crew server

A small Cloudflare Worker with a D1 (SQLite) database for friends and chat: friend codes, progression snapshots for the leaderboard, and 1:1 messages. No AI, no third-party services.

Until it's deployed, the app runs a **demo crew** (simulated friends with canned replies), and the web preview always uses the demo.

## Deploy (free Cloudflare account)

```bash
cd server/social
npx wrangler login
npx wrangler d1 create fitness-buddy-social        # copy the database_id it prints into wrangler.toml
npx wrangler d1 execute fitness-buddy-social --remote --file=schema.sql
npx wrangler deploy                                # prints https://fitness-buddy-social.<you>.workers.dev
```

Then add it to `.env` in the project root and restart `npx expo start`:

```bash
EXPO_PUBLIC_SOCIAL_URL=https://fitness-buddy-social.<you>.workers.dev
```

## What it stores

- **users**: a random id, a 6-character friend code, a SHA-256 hash of the device's secret, and the progression snapshot (name, strength score, rank, level, XP, 8 weeks of score and level history, workouts this week, last workout name and set count, Kettle outfit). Food, body weight and photos never leave the phone.
- **friends**: adding a code links both people, like swapping numbers. Removing unlinks both.
- **messages**: text up to 500 characters, only between linked friends. The app polls every 4 seconds while a chat is open.

## API

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/register` | `{ snapshot }` | `{ id, code, secret }` |
| PUT | `/me` | `{ snapshot }` | `{ ok }` |
| GET | `/friends` | | `{ friends }` |
| POST | `/friends` | `{ code }` | `{ friend }` |
| DELETE | `/friends/:id` | | `{ ok }` |
| POST | `/messages` | `{ to, text }` | `{ message }` |
| GET | `/messages/:friendId?since=<ms>` | | `{ messages }` |

Everything except `/register` needs `Authorization: Bearer <id>:<secret>`.

## Before a public launch

- Add a Cloudflare rate-limiting rule on `/register` and `/messages`.
- Add a **report / block** button and a way to delete an account: Apple requires both for apps with user-to-user chat (App Review Guideline 1.2).
- For push notifications on new messages, add Expo push tokens to `users` and send from the Worker.
