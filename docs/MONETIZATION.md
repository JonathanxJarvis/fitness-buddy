# Fitness Buddy Pro: turning on real subscriptions

The app already has the paywall (`src/app/pro.tsx`), the Pro flag (`settings.pro`, read through `isPro()` in `src/lib/pro.ts`) and the gates:

| Feature | Free | Pro |
| --- | --- | --- |
| Food & water tracking, barcode scan, German foods, workouts, ranks, XP, path | ✓ | ✓ |
| Buddy Coach (offline, no AI) | ✓ | ✓ |
| Kettle mascot | Classic outfit | All 5 outfits |
| Crew (friends, leaderboard, chat) | 3 friends | Unlimited |
| Snap a meal (AI photo estimate) | | ✓ |
| AI coach (Claude) | | ✓ |

What's left is the store purchase itself. Today the paywall button unlocks Pro only in development builds; store builds show "Subscriptions open when the app launches on the App Store".

## Recommended: RevenueCat

RevenueCat wraps StoreKit and Google Play Billing, checks receipts on its servers, and is free until $2,500 monthly revenue.

1. **App Store Connect** → your app → Monetization → Subscriptions. Create a group "Fitness Buddy Pro" with two auto-renewable products:
   - `pro_yearly`: €34.99 / year, 7-day free trial (Introductory offer)
   - `pro_monthly`: €4.99 / month
   Fill in the review screenshot (the paywall) and description. Sign the Paid Apps agreement and add banking/tax info, or products stay "Missing metadata".
2. **RevenueCat**: create a project, add the iOS app with its App Store Connect shared secret / In-App Purchase key, import both products, put them in an entitlement named `pro` and an offering `default` with packages `$rc_annual` and `$rc_monthly`.
3. **Install** (needs a development build, it has native code):
   ```bash
   npx expo install react-native-purchases
   ```
   Put the public iOS SDK key in `.env` as `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (public keys are safe to ship).
4. **Wire it up** in `src/app/pro.tsx`:
   - On app start: `Purchases.configure({ apiKey })`, then read `customerInfo.entitlements.active.pro` and dispatch `updateSettings({ pro: !!active })`. Listen with `Purchases.addCustomerInfoUpdateListener` to keep it in sync (renewals, cancellations, refunds).
   - The CTA: `Purchases.getOfferings()` → `purchasePackage(offering.annual or .monthly)`, then set `pro` from the returned `customerInfo`.
   - Add a **Restore purchases** button (`Purchases.restorePurchases()`); Apple rejects subscription apps without one.
   - Show the price from the package (`product.priceString`) instead of the hard-coded `PLANS` so it's right in every currency.
5. **Legal text on the paywall** (Apple Guideline 3.1.2): price and period, that it renews automatically, how to cancel, and links to your Terms of Use and Privacy Policy.
6. **Test** with a Sandbox tester (App Store Connect → Users and Access → Sandbox) on a development or TestFlight build.

## Alternative: expo-iap

`expo-iap` talks to StoreKit 2 directly with no third party, but you then need your own server to validate receipts and handle renewals. RevenueCat is less work for a solo developer.

## Keep in mind

- Apple takes 15% under the Small Business Program (apply once you have revenue under $1M a year), otherwise 30%.
- AI costs scale with Pro users: Snap a meal and the AI coach run on your `server/ai-proxy` Anthropic account. A photo estimate is a few cents; set a monthly spend limit in the Anthropic console and consider a daily per-user cap in the Worker.
- The free app must stay useful on its own (Guideline 3.1.1 is fine with this model): tracking, workouts, ranks and the offline coach are all free.
