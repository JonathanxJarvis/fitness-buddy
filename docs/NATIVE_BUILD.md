# iPhone extras: widget, Live Activity and Apple Health

Fitness Buddy has three iPhone features that are free for everyone:

- **Home screen widget "Track your calories"**: calories left (or over), eaten vs. your budget, protein, and a nudge to log your next meal based on the time of day. Tapping it opens "Add food" for that meal. Also works on the lock screen (small rectangle and circle).
- **Workout Live Activity**: while a workout is running, the lock screen and the Dynamic Island show the elapsed time, the current and next exercise, and a rest countdown after each set. It starts when you start a workout and goes away when you finish or discard it.
- **Apple Health**: after you tap **Connect** in Profile, the app reads steps, active energy, body weight and workouts from Apple Health each time you open it (and when you come back to it), and saves your finished strength workouts and weigh-ins to Health. Nothing is counted twice: per day the higher step count wins, a weight you typed in the app wins over Health, and workouts that the app itself wrote (or that overlap a workout tracked in the app) are skipped.

## Why they don't work in Expo Go

Expo Go is a ready-made app from the App Store. It can only run features whose native (Swift) code is already inside it. Widgets, Live Activities and Apple Health need extra native code and Apple permissions that Expo Go doesn't have.

So in Expo Go (and on the web) the app still starts and works normally; these features just stay switched off. In Profile, the Apple Health row says **"Needs the installed app"**.

To try them you need your own build of the app, called a **development build**. It's like your personal version of Expo Go that includes this app's native code. You install it on your iPhone once, then keep developing with `npx expo start` as usual. You only need a new build when native things change (new native packages, app.json plugin settings, icons).

## What you need

1. **An Apple Developer account** (Apple Developer Program, about €99 per year). Apple requires it to install your own builds on an iPhone and to use Apple Health, app groups (needed by the widget) and Live Activities. A free Apple ID is not enough for this.
2. **An Expo account** (free) at expo.dev. The build runs in Expo's cloud (EAS), so **you don't need a Mac or Xcode**. It works from Windows.
3. Your iPhone, with **Developer Mode** turned on (Settings › Privacy & Security › Developer Mode) once the build is installed.

## Make a development build (from Windows)

In the project folder:

```bash
npx eas-cli@latest login
npx eas-cli@latest device:create          # register your iPhone (opens a link to open on the phone)
npx eas-cli@latest build --profile development --platform ios
```

- The first time, EAS asks to sign in to your Apple account and creates the certificates, the app ID and the app group (`group.com.jonathanxjarvis.fitnessbuddy`) for you. Say yes to letting it manage them.
- It also creates a second app ID for the widget (`com.jonathanxjarvis.fitnessbuddy.widgets`).
- When the build finishes (about 15–30 minutes), open the link or scan the QR code on your iPhone to install it.

The `development` profile lives in `eas.json`:

```json
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "ios": { "simulator": false }
}
```

`developmentClient: true` uses the `expo-dev-client` package, so the installed app can load your code from your computer like Expo Go does.

## Use it

1. On your computer: `npx expo start` (use `--tunnel` if the phone and PC aren't on the same Wi-Fi).
2. Open the **Fitness Buddy** development app on the iPhone (not Expo Go) and pick your computer's server.
3. **Apple Health**: Profile › Apple Health › **Connect**, and allow the data types in Apple's sheet. You can change them later in the Health app › Profile › Apps › Fitness Buddy.
4. **Widget**: long-press the home screen › **+** › Fitness Buddy › "Track your calories". It updates when you log food in the app, and moves on to the next meal nudge by itself during the day.
5. **Live Activity**: start a workout. If nothing shows, check Settings › Fitness Buddy › Live Activities is on.

## For the App Store

The same features ship in normal store builds: `npx eas-cli@latest build --profile production --platform ios`, then `npx eas-cli@latest submit`. Apple asks for a short explanation of the Health data in App Store Connect (App Privacy): the app reads steps, active energy, weight and workouts and writes workouts and weight, all kept on the phone.

## Where things are in the code

| What | Files |
| --- | --- |
| Settings for Apple (permissions text, widget target, Health) | `app.json` › `plugins` (`expo-widgets`, `@kingstinct/react-native-healthkit`) |
| Widget and Live Activity layouts (SwiftUI via `@expo/ui`) | `src/widgets/layouts.tsx` |
| What the widget and Live Activity show (tested) | `src/lib/widgetData.ts` |
| Apple Health sync and duplicate rules (rules are tested) | `src/lib/health.ts`, `src/lib/healthSync.ts` |
| Safe loading so Expo Go and web don't crash | `src/lib/nativeWidgets(.ios).ts`, `src/lib/healthKit(.ios).ts` |
| Watches the app's data and updates everything | `src/components/NativeBridges.tsx` (mounted in `src/app/_layout.tsx`) |
| Profile row | `src/components/HealthRow.tsx` |

Don't edit an `ios/` folder by hand: it's generated from `app.json` during the build.
