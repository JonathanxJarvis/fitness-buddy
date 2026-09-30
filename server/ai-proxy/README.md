# Fitness Buddy AI server

A ~100-line Cloudflare Worker that holds your Claude API key, so people using the app can snap meals and chat with Coach without a key of their own. This is how apps like Yazio do it: the AI key lives on the company's server, never in the app.

## Deploy (about 5 minutes, free Cloudflare account)

```bash
cd server/ai-proxy
npx wrangler login                          # opens the browser to sign in to Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key from console.anthropic.com
npx wrangler secret put APP_TOKEN           # optional: any random string, e.g. from `openssl rand -hex 16`
npx wrangler deploy                         # prints https://fitness-buddy-ai.<you>.workers.dev
```

Then tell the app where it is. Create `.env` in the project root:

```bash
EXPO_PUBLIC_AI_PROXY_URL=https://fitness-buddy-ai.<you>.workers.dev
EXPO_PUBLIC_AI_APP_TOKEN=<the same APP_TOKEN, if you set one>
```

Restart `npx expo start`. Snap a meal and Coach now work with no key in the app. Someone who pastes their own key in Profile still uses their own key instead.

## Cost and safety

- Every photo and chat message is billed to **your** Anthropic account. A photo estimate or chat reply is typically a few cents. Set a monthly spend limit in the Anthropic console.
- The Worker only accepts the requests the app makes: the allowed model, at most 2,048 output tokens, no tools, no streaming, bodies under 6 MB.
- It allows 60 requests per hour per IP address on each Worker instance. That's a best-effort limit; for a public launch, add a Cloudflare rate-limiting rule or require user sign-in.
- `APP_TOKEN` ships inside the app, so it keeps out casual traffic but isn't a real secret.
