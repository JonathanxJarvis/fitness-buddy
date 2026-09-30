# Publishing Fitness Buddy to the App Store

This is the whole path from this repo to a live App Store listing. You don't need a Mac or Xcode: Expo's EAS service builds and signs the app in the cloud.

The app is already configured for it:

- `app.json` has the bundle ID `com.jonathanxjarvis.fitnessbuddy` (iOS and Android), version `1.0.0`, camera/photo/motion permission texts, encryption export compliance (`usesNonExemptEncryption: false`) and a privacy manifest.
- `eas.json` has a `preview` profile (installable test build) and a `production` profile (App Store build, build number bumps automatically).

## What it costs

| Item | Cost |
| --- | --- |
| Apple Developer Program | $99 per year (required to publish on iOS) |
| Google Play developer account | $25 once (only if you also want Android) |
| Expo / EAS account | Free tier includes a monthly quota of cloud builds |
| Cloudflare Worker for the AI | Free tier covers 100,000 requests a day |
| Claude API usage | Pay per use on your Anthropic account; set a monthly spend limit in the console |

## Step 1: Accounts (one time)

1. Enroll at <https://developer.apple.com/programs/enroll/> with your Apple ID. Approval usually takes a day or two. Individual enrollment is fine; your name is shown as the seller.
2. Create a free Expo account at <https://expo.dev/signup>.
3. Install Node.js 20 or newer on your computer, then clone the repo and install:

   ```bash
   git clone https://github.com/JonathanxJarvis/fitness-buddy.git
   cd fitness-buddy
   npm install
   ```

## Step 2: Turn on the AI for everyone (one time)

Snap-a-meal and Coach call Claude through a small server so users never need a key. Follow `server/ai-proxy/README.md` (about 5 minutes): deploy the Worker, then put its URL into **both** `env` blocks in `eas.json`:

```json
"EXPO_PUBLIC_AI_PROXY_URL": "https://fitness-buddy-ai.<your-subdomain>.workers.dev"
```

If you skip this, the app still works; users would just need their own API key for the AI features.

## Step 3: Pick your final bundle ID (optional)

`com.jonathanxjarvis.fitnessbuddy` is ready to use. If you'd rather own a different one (for example `com.yourname.fitnessbuddy`), change `ios.bundleIdentifier` and `android.package` in `app.json` now. It can't be changed after the first App Store upload.

## Step 4: Test build on your own iPhone

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # links the project to your Expo account
npx eas-cli@latest device:create # registers your iPhone (open the link on the phone)
npx eas-cli@latest build --platform ios --profile preview
```

EAS asks to sign in to your Apple account and creates the certificates for you (answer yes to each prompt). When the build finishes you get a QR code; scan it on the registered iPhone to install.

Things to check on a real device: barcode and QR scanning, snap-a-meal, the rest timer haptics, step counting, reminders, and dark mode.

## Step 5: Create the App Store listing

In <https://appstoreconnect.apple.com> → **Apps** → **+** → **New App**:

- Platform: iOS, Name: Fitness Buddy (must be unique on the store; try "Fitness Buddy: Calories & Gym" if taken)
- Primary language, Bundle ID: pick `com.jonathanxjarvis.fitnessbuddy` from the list, SKU: `fitness-buddy`

Then fill in:

- **Screenshots**: 6.9-inch iPhone screenshots (1320 × 2868) are required; 3 to 10 of them. Take them on your iPhone from the preview build (Today, Train, active workout, Snap a meal, Coach, Progress).
- **Description, keywords, support URL** (the GitHub repo URL works as a support URL).
- **Privacy policy URL**: required. Host `docs/PRIVACY.md` (for example publish it as a GitHub Pages page or a Notion page) and paste the link.
- **App Privacy** questionnaire: see the answers at the bottom of `docs/PRIVACY.md`.
- **Age rating**: no objectionable content; answer "No" to everything.
- **Category**: Health & Fitness.

## Step 6: Build and submit

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

`submit` uploads the build to App Store Connect. After Apple finishes processing (around 15 to 30 minutes) it shows up under **TestFlight**, where you and up to 100 testers can install it. When it looks good, select the build on the version page and press **Add for Review**. Reviews typically take one to two days.

### Review tips that avoid common rejections

- Apple guideline 1.4.1 (health): the Coach already says it is not a doctor. Keep calorie goals from going below safe minimums (the app floors them).
- The AI must work for the reviewer without setup, which is why Step 2 matters. Mention in **Review Notes**: "AI meal estimates and the Coach work without login. No account is required; all data stays on the device."
- If the reviewer can't reach a feature (camera in a simulator), say so in Review Notes.

## Step 7: Updates after launch

- JavaScript-only changes: bump nothing and run another production build + submit, or set up over-the-air updates later with `eas update`.
- Every store upload needs a higher build number; `autoIncrement` in `eas.json` handles that. Bump `version` in `app.json` (for example `1.1.0`) for user-visible releases.

## Android (optional)

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --latest
```

The first Android upload has to be done by hand in the Google Play Console; after that `submit` works. Google requires a closed test with 12 testers for 14 days for new personal developer accounts before production release.
