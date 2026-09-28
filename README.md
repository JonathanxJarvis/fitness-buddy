# Fitness Buddy 🥗

A nutrition and fitness tracker for iOS and Android, in the spirit of Yazio and MyFitnessPal. Built with React Native and Expo (SDK 57) and Expo Router. All your data stays on your phone.

## Features

- **Today dashboard** with rings for calories (food minus exercise), protein, carbs, fat and water, each against your daily goal.
- **Barcode scanner** that looks products up in [Open Food Facts](https://openfoodfacts.org) (about 3 million packaged foods, no account or API key). Unknown barcodes can be saved as a custom food and are recognized next time.
- **Food search** across ~100 built-in common foods (works offline), your custom and favorite foods, and Open Food Facts online.
- **Logging by meal**: breakfast, lunch, dinner and snacks, with serving sizes (package serving, 100 g, oz, g) and amounts. Tap an entry to edit it, long-press to delete.
- **Tracks** water, weight, steps (synced from the phone's motion sensor), exercise (calories estimated from activity and your weight), fiber, sugar, sodium, potassium, calcium, iron, vitamin C and vitamin D.
- **Custom foods and quick add** for anything that isn't in the database.
- **Saved meals and recipes**: save a group of foods and re-log it in one tap, or build a recipe that makes N portions and log it per portion. "Save as meal" works on any meal you've logged. Recent and favorite foods are one tap away.
- **Calendar**: tap any day to see what you logged, then jump in to edit it. Days are color-coded (on target, over, under), with current and best streaks.
- **Progress charts** over 7, 30 or 90 days for calories, protein, weight, water and steps.
- **Tips and nudges**: a daily nutrition or hydration tip, plus smart nudges based on what you've logged ("You're low on protein today", behind on water, sodium over the limit, streak milestones and more).
- **Onboarding** that sets calorie, macro, water and micronutrient goals from your age, sex, height, weight, activity level and goal (lose, maintain, gain) using the Mifflin–St Jeor equation. Every goal can be fine-tuned afterwards.
- **Reminders** to log breakfast, lunch and dinner, and to drink water every 1–3 hours (local notifications).
- **US or metric units** (lb/ft/fl oz or kg/cm/ml), and **light, dark or automatic theme**, with green as the main color.
- **Export** a JSON backup of your data, or erase everything.

Photo recognition of meals was left out: every reliable food-photo API needs a paid key, and this app is meant to run with no accounts or keys.

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
5. The app opens in Expo Go. Allow camera access when you first scan a barcode, motion access for steps, and notifications when you turn on reminders.

If your phone and computer aren't on the same Wi-Fi (or the QR code won't connect), run `npx expo start --tunnel` instead.

### Notes for Expo Go

- Steps: iOS reads today's full step count. Android only counts steps while the app is open, so you can also type steps in by hand from the Activity card.
- Reminders are local notifications, which work in Expo Go. Only remote push notifications need a development build.

## Development

```bash
npm test            # unit tests (goal math, Open Food Facts mapping, streaks, nudges, state)
npm run typecheck   # TypeScript
npx expo start      # dev server (press i / a for simulators, w for web)
```

### Project layout

```
src/
  app/              Expo Router screens
    (tabs)/         Today, Calendar, Progress, Meals, Me
    onboarding.tsx  goal setup
    add-food.tsx    search, recents, favorites, saved meals
    food.tsx        food details and logging
    scan.tsx        barcode scanner
    ...
  components/       UI kit, progress rings, charts
  lib/              nutrition math, food database, Open Food Facts client, tips, units, dates, reminders
  store/            app state (reducer + AsyncStorage persistence)
```

Data is stored with AsyncStorage under a single versioned key. Nutrients for each diary entry are snapshotted when logged, so editing or deleting a custom food never changes your history.

Food data from Open Food Facts is available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).
