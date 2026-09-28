# Fitness Buddy 🥗

A nutrition and fitness tracker for iOS and Android, in the spirit of Yazio and MyFitnessPal. Built with React Native and Expo (SDK 57) and Expo Router. All your data stays on your phone.

## Features

- **Workout tracker (Train tab)**: start an empty workout or a routine (Push, Pull, Legs, Full body templates, or your own), log sets with weight and reps, see last session's numbers beside each set, and a rest timer starts when you check a set off. 60+ exercises by muscle group plus custom exercises. Personal records use an estimated one-rep max (Epley). Finished workouts go into history, add their calories burned to the day's budget, show up as training volume in Progress, and are visible to the Coach.
- **Premium Today dashboard**: a greeting with your streak, a week strip with a mini calorie ring per day, a deep-green hero card with calories left (goal + exercise − food), and animated bars for protein, carbs, fat and fiber. Everything counts up and fades in.
- **Protein at 1 g per lb of body weight** by default (editable in Daily goals). There is no water goal; water is still tracked by the glass.
- **Snap a meal (AI)**: take or pick a photo and Claude identifies each food, estimates portions in grams and returns calories, protein, carbs, fat, fiber, sugar and sodium, with a confidence level and a health score. Adjust the portion, pick the meal and log it with the photo.
- **Coach (AI chat)**: a chatbot that knows your goals, today's log and the last week. Ask what to eat to hit protein, how your day looks, or attach a meal photo and ask about it. "Ask Coach about this meal" hands a photo estimate straight to the chat.
- **Huge food database**: ~100 built-in common foods (offline), plus live search across **USDA FoodData Central** (~400,000 generic and branded foods) and **Open Food Facts** (~3 million packaged products), merged into one list.
- **German supermarket foods**: set Food database to Germany in Profile to search de.openfoodfacts.org first with German product names.
- **Barcode and QR scanner** backed by Open Food Facts, including GS1 QR/DataMatrix codes on newer packaging. Unknown barcodes can be saved as a custom food.
- **Meal detail** with a hero photo, 2×2 nutrition tiles, an overall health score (0–100 with a letter grade), vitamins and minerals.
- **Logging by meal** with per-meal calorie rings (each meal has a share of your daily goal), entry times, photo thumbnails and an AI badge for photo-logged meals.
- **Center + button** for quick actions: snap a meal, scan, search, add water, start a workout, log cardio or weight.
- **Tracks** water, weight, steps (motion sensor), exercise, fiber, sugar, sodium, potassium, calcium, iron, vitamin C and vitamin D.
- **Saved meals, recipes, favorites and custom foods** (Profile → My foods & meals).
- **Diary calendar** with color-coded days and streaks, and **Progress** charts over 7, 30 or 90 days.
- **Tips and smart nudges**, **onboarding** that builds your plan (Mifflin–St Jeor), **reminders** for meals and water, **US or metric units**, and **light, dark or automatic theme**.

### AI setup (no key for users)

Like Yazio, the AI key lives on a server, not in the app. `server/ai-proxy` is a tiny Cloudflare Worker that holds your Claude API key and forwards the app's requests to Claude. Deploy it once (steps in [server/ai-proxy/README.md](server/ai-proxy/README.md)), put its URL in `.env` as `EXPO_PUBLIC_AI_PROXY_URL` (see `.env.example`), and Snap a meal and Coach work for everyone with no key. AI usage is billed to your Anthropic account.

Requests use `claude-opus-5` with Anthropic's server-side fallbacks turned on, so a busy model falls back to another Claude model instead of failing. Anyone can still paste their own key under Profile → AI Coach & meal photos to use their own account; it's stored in the phone's secure keychain and only sent to Anthropic. With no server and no key, the rest of the app works and Snap a meal offers a clearly labeled sample result.

Photo estimates are estimates: portion sizes from a picture can be off by 20% or more, so adjust the portion or edit the entry if you know better.

## Publish to the App Store

The app is configured for EAS Build (`eas.json`, bundle ID in `app.json`). The full step-by-step guide, including costs, the store listing and review tips, is in [docs/APP_STORE.md](docs/APP_STORE.md). A privacy policy you can host is in [docs/PRIVACY.md](docs/PRIVACY.md).

## Run it on your phone with Expo Go

1. Install **Expo Go** on your phone from the [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent). Make sure it's up to date, since this project uses Expo SDK 57.
2. Install [Node.js](https://nodejs.org) 20 or newer on your computer.
3. Clone and start the project:
   ```bash
   git clone https://github.com/JonathanxJarvis/fitness-buddy.git
   cd fitness-buddy
   npm install
   npx expo start
   ```
4. Scan the QR code in the terminal:
   - **iPhone**: open the Camera app and tap the banner.
   - **Android**: open Expo Go and tap **Scan QR code**.
5. The app opens in Expo Go. Allow camera and photo access when you first scan a barcode or snap a meal, motion access for steps, and notifications when you turn on reminders.

If your phone and computer aren't on the same Wi-Fi (or the QR code won't connect), run `npx expo start --tunnel` instead.

### Notes for Expo Go

- Steps: iOS reads today's full step count. Android only counts steps while the app is open, so you can also type steps in by hand from the Activity card.
- Reminders are local notifications, which work in Expo Go. Only remote push notifications need a development build.

## Development

```bash
npm test            # unit tests (goal math, USDA/Open Food Facts mapping, AI estimate parsing, health score, streaks, nudges, state)
npm run typecheck   # TypeScript
npx expo start      # dev server (press i / a for simulators, w for web)
```

### Project layout

```
src/
  app/              Expo Router screens
    (tabs)/         Today, Diary, Coach (AI chat), Progress
    snap-meal.tsx   photo → AI nutrition estimate
    onboarding.tsx  goal setup
    add-food.tsx    search (built-in + USDA + Open Food Facts), recents, favorites, saved meals
    food.tsx        meal/food detail with health score
    profile.tsx     profile, AI key, units, theme
    scan.tsx        barcode scanner
    ...
  components/       UI kit, animated rings, sheets, tab bar, charts
  lib/              nutrition math, food databases (built-in, USDA, Open Food Facts), Claude client, tips, units, dates, reminders
  store/            app state (reducer + AsyncStorage persistence)
```

Data is stored with AsyncStorage under a single versioned key. Nutrients for each diary entry are snapshotted when logged, so editing or deleting a custom food never changes your history.

Food data comes from USDA FoodData Central (public domain, via the free DEMO_KEY, which is rate limited per device) and Open Food Facts, available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).
