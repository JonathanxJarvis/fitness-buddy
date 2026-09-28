import type { DiaryEntry, Goals, MealType, Nutrients } from './types';
import { fromKey } from './dates';

export interface Tip {
  title: string;
  body: string;
  kind: 'nutrition' | 'hydration' | 'activity';
}

export const DAILY_TIPS: Tip[] = [
  { kind: 'nutrition', title: 'Protein at breakfast', body: 'Aim for 20–30 g of protein in the morning. Eggs, Greek yogurt or cottage cheese keep you full until lunch.' },
  { kind: 'hydration', title: 'Start with a glass', body: 'Drink a glass of water right after you wake up. You have gone 7–8 hours without any.' },
  { kind: 'nutrition', title: 'Half a plate of plants', body: 'Filling half your plate with vegetables adds fiber and volume for very few calories.' },
  { kind: 'hydration', title: 'Thirst can feel like hunger', body: 'Feeling snacky between meals? Try a glass of water first and wait 10 minutes.' },
  { kind: 'nutrition', title: 'Watch liquid calories', body: 'Juice, soda and fancy coffee drinks add up fast and don’t fill you up. Log them too.' },
  { kind: 'nutrition', title: 'Fiber goal', body: 'Most adults get about half the fiber they need. Beans, berries, oats and whole grains are easy wins.' },
  { kind: 'activity', title: 'Walk after meals', body: 'A 10-minute walk after eating helps smooth out blood sugar and adds about 1,000 steps.' },
  { kind: 'nutrition', title: 'Read the serving size', body: 'Nutrition labels are per serving, and a package often holds more than one.' },
  { kind: 'hydration', title: 'Check the color', body: 'Pale yellow urine is a simple sign you are drinking enough water.' },
  { kind: 'nutrition', title: 'Sodium sneaks in', body: 'Bread, deli meat, soups and sauces carry most of our sodium, not the salt shaker.' },
  { kind: 'nutrition', title: 'Plan your snacks', body: 'Pre-portion snacks like nuts into small containers so a handful doesn’t turn into a bag.' },
  { kind: 'hydration', title: 'Eat your water', body: 'Cucumber, watermelon, oranges and soups all count toward hydration.' },
  { kind: 'nutrition', title: 'Slow down', body: 'It takes about 20 minutes for fullness signals to reach your brain. Put the fork down between bites.' },
  { kind: 'activity', title: 'Protein after training', body: 'Having protein within a few hours of a workout supports muscle repair.' },
  { kind: 'nutrition', title: 'Colorful plates', body: 'Different colored fruits and vegetables bring different vitamins. Try to eat three colors a day.' },
  { kind: 'hydration', title: 'Carry a bottle', body: 'Keeping a refillable bottle in sight is one of the easiest ways to drink more.' },
  { kind: 'nutrition', title: 'Log before you eat', body: 'Logging a meal before eating makes it easier to adjust portions while it still counts.' },
  { kind: 'nutrition', title: 'Sugar limit', body: 'Try to keep added sugar under 10% of your calories. Flavored yogurts and granola often hide a lot.' },
  { kind: 'activity', title: 'Sleep matters', body: 'Short sleep increases hunger hormones. 7–9 hours makes hitting your goals easier.' },
  { kind: 'nutrition', title: 'Healthy fats', body: 'Olive oil, avocado, nuts and fatty fish support heart health, but they are calorie dense, so measure them.' },
  { kind: 'hydration', title: 'Coffee counts', body: 'Coffee and tea count toward your fluids. Just keep an eye on the sugar and cream.' },
  { kind: 'nutrition', title: 'Vitamin D', body: 'Few foods contain vitamin D. Salmon, eggs and fortified milk help, especially in winter.' },
  { kind: 'nutrition', title: 'Iron and vitamin C', body: 'Pairing iron-rich plants like beans or spinach with vitamin C helps your body absorb the iron.' },
  { kind: 'activity', title: 'Stand up every hour', body: 'Breaking up long sitting sessions with a short walk keeps energy up.' },
  { kind: 'nutrition', title: 'Weekends count', body: 'Weekend meals often add 20% more calories. Planning one treat meal beats grazing all day.' },
  { kind: 'hydration', title: 'Before each meal', body: 'Drinking a glass of water before meals can help you feel fuller.' },
  { kind: 'nutrition', title: 'Potassium', body: 'Potatoes, beans, bananas and yogurt are rich in potassium, which helps balance sodium.' },
  { kind: 'nutrition', title: 'Consistency beats perfection', body: 'A day over your goal doesn’t undo a good week. Keep logging and look at the weekly trend.' },
];

export function tipForDate(dateKey: string): Tip {
  const d = fromKey(dateKey);
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}

export interface Nudge {
  id: string;
  tone: 'info' | 'warning' | 'success';
  icon: string;
  text: string;
}

export interface NudgeInput {
  totals: Nutrients;
  goals: Goals;
  waterMl: number;
  entries: DiaryEntry[]; // entries for the day
  hour: number; // current hour of day (0-23); pass 24 for past days
  streak: number;
  steps: number;
}

const pct = (v: number | undefined, goal: number) => (goal > 0 ? (v ?? 0) / goal : 0);

/** Contextual suggestions based on what has been logged so far today. */
export function buildNudges({ totals, goals, waterMl, entries, hour, streak, steps }: NudgeInput): Nudge[] {
  const out: Nudge[] = [];
  const logged = (m: MealType) => entries.some((e) => e.meal === m);
  // How far through the eating day we are (7am → 9pm).
  const dayProgress = Math.min(1, Math.max(0, (hour - 7) / 14));

  if (entries.length === 0 && hour >= 10 && hour < 24) {
    out.push({ id: 'nothing', tone: 'info', icon: 'create-outline', text: 'Nothing logged yet today. Add your first meal to keep your streak going.' });
  } else if (!logged('breakfast') && hour >= 11 && hour < 24 && entries.length > 0) {
    out.push({ id: 'breakfast', tone: 'info', icon: 'sunny-outline', text: 'No breakfast logged. Did you forget to add it?' });
  }

  if (totals.calories > goals.calories * 1.05) {
    out.push({ id: 'cal-over', tone: 'warning', icon: 'flame-outline', text: `You're ${Math.round(totals.calories - goals.calories)} kcal over your goal. A walk or a lighter dinner can balance it out.` });
  }

  if (hour >= 13 && entries.length > 0 && pct(totals.protein, goals.protein) < dayProgress * 0.6) {
    const left = Math.round(goals.protein - totals.protein);
    out.push({ id: 'protein-low', tone: 'info', icon: 'barbell-outline', text: `You're low on protein today, ${left} g to go. Try chicken, Greek yogurt, eggs, tofu or beans.` });
  }

  if (hour >= 12 && pct(waterMl, goals.waterMl) < dayProgress * 0.6) {
    out.push({ id: 'water-low', tone: 'info', icon: 'water-outline', text: 'You’re behind on water. Have a glass now and keep a bottle nearby.' });
  } else if (waterMl >= goals.waterMl) {
    out.push({ id: 'water-done', tone: 'success', icon: 'water', text: 'Water goal reached. Nice work staying hydrated!' });
  }

  if ((totals.sodium ?? 0) > goals.sodium) {
    out.push({ id: 'sodium-high', tone: 'warning', icon: 'alert-circle-outline', text: 'Sodium is over the daily limit. Choose fresh foods and drink extra water for the rest of the day.' });
  }
  if ((totals.sugar ?? 0) > goals.sugar) {
    out.push({ id: 'sugar-high', tone: 'warning', icon: 'ice-cream-outline', text: 'Sugar is over your limit. Fruit, nuts or yogurt make a good swap for sweets.' });
  }
  if (hour >= 17 && entries.length > 0 && pct(totals.fiber, goals.fiber) < 0.5) {
    out.push({ id: 'fiber-low', tone: 'info', icon: 'leaf-outline', text: 'Fiber is under half your goal. Add veggies, beans or berries to dinner.' });
  }

  if (hour >= 17 && hour < 24 && steps > 0 && steps < goals.steps * 0.5) {
    out.push({ id: 'steps-low', tone: 'info', icon: 'walk-outline', text: `${(goals.steps - steps).toLocaleString()} steps left today. An evening walk will close the gap.` });
  }

  const macrosClose =
    entries.length > 0 &&
    Math.abs(totals.calories - goals.calories) <= goals.calories * 0.05 &&
    pct(totals.protein, goals.protein) >= 0.9;
  if (macrosClose) {
    out.push({ id: 'on-target', tone: 'success', icon: 'trophy-outline', text: 'Right on target for calories and protein today. Great job!' });
  }

  if ([3, 7, 14, 30, 50, 100, 365].includes(streak)) {
    out.push({ id: 'streak', tone: 'success', icon: 'flame', text: `${streak}-day logging streak! Consistency is what gets results.` });
  }

  return out;
}
