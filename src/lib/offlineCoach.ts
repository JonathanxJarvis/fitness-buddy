import { BUILTIN_FOODS } from './foodDatabase';
import { GERMAN_FOODS } from './germanFoods';
import { addDays, todayKey } from './dates';
import { MEAL_SHARES } from './nutrition';
import { daySummary } from './selectors';
import { findExercise, TEMPLATES } from './training';
import { LEVEL_NAMES, LIFTS, progression, STAGES } from './progression';
import { formatWeight, weightValue, weightUnit } from './units';
import type { AppState, Food, MealType, Muscle } from './types';

/*
 * Buddy Coach: a coach that runs entirely on the phone. It reads your goals,
 * today's log, your workouts and your rank, recognizes what you're asking
 * (English or German), and answers with your real numbers. No AI service needed.
 */

const r = (n: number) => Math.round(n);

interface Ctx {
  state: AppState;
  today: string;
  left: { kcal: number; protein: number; carbs: number; fat: number };
  eaten: { kcal: number; protein: number };
  burned: number;
  foods: Food[];
  name: string;
}

function context(state: AppState, today: string): Ctx {
  const day = daySummary(state, today);
  const g = state.goals!;
  const budget = g.calories + day.burned;
  const foods = state.settings.foodRegion === 'de' ? GERMAN_FOODS : BUILTIN_FOODS;
  return {
    state,
    today,
    left: { kcal: budget - day.totals.calories, protein: g.protein - day.totals.protein, carbs: g.carbs - day.totals.carbs, fat: g.fat - day.totals.fat },
    eaten: { kcal: day.totals.calories, protein: day.totals.protein },
    burned: day.burned,
    foods,
    name: state.profile?.name?.split(' ')[0] ?? '',
  };
}

/** Foods that pack the most protein per calorie and fit the remaining budget. */
export function proteinPicks(foods: Food[], kcalLeft: number, n = 3): Food[] {
  return foods
    .filter((f) => f.nutrients.protein >= 12 && f.nutrients.calories <= Math.max(150, kcalLeft))
    .sort((a, b) => b.nutrients.protein / b.nutrients.calories - a.nutrients.protein / a.nutrients.calories)
    .slice(0, n);
}

const serving = (f: Food) => f.servings[0].label;
const line = (f: Food) => `**${f.name}** (${serving(f)}): ${r(f.nutrients.protein)} g protein, ${r(f.nutrients.calories)} kcal`;

function mealNow(): MealType {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h >= 17 && h < 22 ? 'dinner' : 'snacks';
}

// ---------- intents ----------

function howAmIDoing(c: Ctx): string {
  const g = c.state.goals!;
  if (c.eaten.kcal === 0) return `Nothing logged yet today${c.name ? `, ${c.name}` : ''}. Your budget is **${g.calories.toLocaleString()} kcal** with **${g.protein} g protein**. Log breakfast and I’ll keep score.`;
  const kcalLine = c.left.kcal >= 0 ? `**${r(c.left.kcal)} kcal left** of ${(g.calories + c.burned).toLocaleString()}` : `**${r(-c.left.kcal)} kcal over** today’s budget`;
  const protein = c.left.protein > 0 ? `${r(c.left.protein)} g protein still to go` : 'protein goal done ✅';
  const tip =
    c.left.protein > 40 && c.left.kcal > 0
      ? `Protein is the gap. Make your next meal protein-first.`
      : c.left.kcal < 0
        ? `No stress: one day over doesn’t undo a week. Keep dinner light and lean.`
        : `You’re on track. Keep it boring and consistent.`;
  return `${kcalLine}, ${protein}.\n- Eaten: ${r(c.eaten.kcal)} kcal, ${r(c.eaten.protein)} g protein\n- Burned: ${r(c.burned)} kcal from exercise\n\n${tip}`;
}

function protein(c: Ctx): string {
  if (c.left.protein <= 0) return `You’ve hit your protein goal today (${r(c.eaten.protein)} g). Anything more is a bonus, not a must.`;
  const picks = proteinPicks(c.foods, c.left.kcal);
  return `You need **${r(c.left.protein)} g more protein** with ${r(Math.max(0, c.left.kcal))} kcal left. Best value picks:\n${picks.map((f) => `- ${line(f)}`).join('\n')}\n\nTwo of those gets you most of the way.`;
}

function whatToEat(c: Ctx, q: string): string {
  const meal: MealType = /breakfast|frühstück/.test(q) ? 'breakfast' : /lunch|mittag/.test(q) ? 'lunch' : /dinner|abend/.test(q) ? 'dinner' : /snack/.test(q) ? 'snacks' : mealNow();
  const target = Math.max(150, Math.min(c.left.kcal, c.state.goals!.calories * MEAL_SHARES[meal] * 1.2));
  const main = proteinPicks(c.foods, target, 6);
  const pick = main[new Date().getDate() % Math.max(1, main.length)];
  const carbs = c.foods.filter((f) => f.nutrients.carbs >= 20 && f.nutrients.calories <= target - (pick?.nutrients.calories ?? 0) && f.nutrients.fat < 10);
  const carb = carbs[(new Date().getDay() * 3) % Math.max(1, carbs.length)];
  const veg = c.foods.filter((f) => f.nutrients.calories < 60 && (f.nutrients.fiber ?? 0) >= 1.5);
  const v = veg[new Date().getDate() % Math.max(1, veg.length)];
  const items = [pick, carb, v].filter(Boolean) as Food[];
  const total = items.reduce((s, f) => s + f.nutrients.calories, 0);
  const prot = items.reduce((s, f) => s + f.nutrients.protein, 0);
  if (c.left.kcal < 150) return `You’re at ${r(c.left.kcal)} kcal left, so keep it tiny: ${line(proteinPicks(c.foods, 200, 1)[0])}. Or have tea and call it a win.`;
  return `For ${meal === 'snacks' ? 'a snack' : meal}, aim for about **${r(target)} kcal**. Try:\n${items.map((f) => `- ${line(f)}`).join('\n')}\n\nThat’s ~${r(total)} kcal and ${r(prot)} g protein. Tap + to log any of them.`;
}

function trainToday(c: Ctx): string {
  const ws = c.state.workouts;
  const lastByMuscle = new Map<Muscle, string>();
  for (const w of ws) for (const e of w.exercises) {
    const m = findExercise(e.exerciseId, c.state.customExercises)?.muscle;
    if (m) lastByMuscle.set(m, w.date);
  }
  const trainedYesterday = ws.some((w) => w.date === addDays(c.today, -1));
  const trainedTwoDays = trainedYesterday && ws.some((w) => w.date === addDays(c.today, -2));
  const already = ws.some((w) => w.date === c.today);
  if (already) return `You already trained today 💪 Recovery is where you grow: protein, water, and 7–9 hours of sleep.`;
  if (trainedTwoDays) return `You’ve trained two days in a row. If you feel beat up, take today off or do a 30-minute walk. If you feel great, go for the muscles you haven’t hit lately.`;
  const score = (tpl: (typeof TEMPLATES)[number]) => {
    const muscles = tpl.exercises.map((x) => findExercise(x.exerciseId)?.muscle).filter(Boolean) as Muscle[];
    // Older (or never) trained muscles score higher.
    return muscles.reduce((s, m) => s + (lastByMuscle.has(m) ? Math.min(7, daysBetween(lastByMuscle.get(m)!, c.today)) : 8), 0) / muscles.length;
  };
  const best = [...TEMPLATES].sort((a, b) => score(b) - score(a))[0];
  const names = best.exercises.map((x) => findExercise(x.exerciseId)?.name).filter(Boolean);
  return `Today looks like a **${best.name} day**: those muscles have rested the longest.\n${names.map((n) => `- ${n}`).join('\n')}\n\nStart it from the Train tab. Beat last time by one rep or ${c.state.settings.units === 'us' ? '5 lb' : '2.5 kg'} on the first lift.`;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function rank(c: Ctx): string {
  const p = c.state.profile!;
  const pr = progression(c.state.workouts, p.weightKg, p.sex, c.today);
  const next = STAGES[pr.stage.index + 1];
  const units = c.state.settings.units;
  if (!pr.lifts.length) return `You’re **Rookie III** for now. Log a squat, bench, deadlift, overhead press or pull-ups and I’ll rank you. You’re **level ${pr.level}** from ${pr.xp} XP.`;
  const weak = pr.weakest;
  const weakTip = weak?.next
    ? `\n\nFastest way up: your **${weak.label.toLowerCase()}** is ${LEVEL_NAMES[weak.level] ?? 'below beginner'} level. Next target: ${weak.kind === 'ratio' ? formatWeight(weak.next, units, 0) + ' estimated max' : Math.ceil(weak.next) + ' reps'}.`
    : '';
  const missing = pr.lifts.length < 4 ? LIFTS.filter((l) => !pr.lifts.some((x) => x.key === l.key)).slice(0, 4 - pr.lifts.length).map((l) => l.label.toLowerCase()) : [];
  const coverTip = missing.length ? `\n- Your score counts your best 4 lifts. Add ${missing.map((m) => `**${m}**`).join(missing.length > 2 ? ', ' : ' and ').replace(/, (?=[^,]*$)/, ' and ')} sets and it climbs fast.` : '';
  const growth = pr.history[pr.history.length - 1].score - pr.history[0].score;
  return `You’re **${pr.stage.label}** (score ${pr.score.toFixed(1)}) and **level ${pr.level}**.${next ? ` ${Math.max(0, next.min - pr.score).toFixed(1)} points to ${next.label}.` : ' That’s the top rank. Legend.'}\n- 8-week growth: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)} points${coverTip}${weakTip}`;
}

function plateau(step: string): string {
  return `Stuck? Try this, in order:\n- **Add reps before weight**: when you hit the top of your rep range on all sets, add ${step}.\n- **Eat enough**: protein at 1 g per lb, and don’t cut hard while chasing PRs.\n- **Sleep 7–9 h**. It’s the cheapest steroid there is.\n- **Deload**: after 6–8 weeks, one week at ~60% weight resets fatigue.\n- **Swap a variation** (e.g. paused bench) for 4 weeks, then go back.`;
}

function weight(c: Ctx): string {
  const units = c.state.settings.units;
  const ws = Object.entries(c.state.weights).sort(([a], [b]) => a.localeCompare(b));
  const p = c.state.profile!;
  if (ws.length < 2) return `Log your weight a few times a week (same time, after the bathroom, before breakfast) and I’ll show your real trend. Your plan aims for ${p.goal === 'maintain' ? 'maintenance' : `${formatWeight(p.weeklyRateKg, units)} per week`}.`;
  const recent = ws.filter(([d]) => d >= addDays(c.today, -28));
  const from = recent[0] ?? ws[0];
  const to = ws[ws.length - 1];
  const weeks = Math.max(1, daysBetween(from[0], to[0]) / 7);
  const rate = (to[1] - from[1]) / weeks;
  return `Your trend: **${rate >= 0 ? '+' : ''}${weightValue(rate, units).toFixed(2)} ${weightUnit(units)} per week** over the last ${r(weeks)} week${weeks >= 2 ? 's' : ''}.\n- Goal: ${p.goal === 'lose' ? '−' : p.goal === 'gain' ? '+' : '±'}${formatWeight(p.weeklyRateKg, units)} per week\n\nDaily weight bounces with water and salt. Judge the weekly average, not one morning.`;
}

function water(c: Ctx): string {
  const ml = c.state.water[c.today] ?? 0;
  const target = Math.round((c.state.profile?.weightKg ?? 75) * 35);
  return `You’ve had ${ml} ml today. A good baseline is about **${target} ml** (35 ml per kg), plus ~500 ml per hour of training. Pale yellow = good.`;
}

function supplements(q: string): string {
  if (/creatin/.test(q)) return `**Creatine monohydrate** is the best-studied supplement there is: 3–5 g every day, any time, no loading needed. Expect a little water weight (that’s in the muscle, not fat).`;
  return `Only a few supplements are worth it:\n- **Creatine monohydrate**, 3–5 g daily\n- **Protein powder**, if food alone doesn’t reach your protein goal\n- **Vitamin D** in winter if you get little sun\n- **Caffeine** before training, if you tolerate it\n\nEverything else is mostly marketing.`;
}

function recovery(): string {
  return `Recovery checklist:\n- **Sleep** 7–9 hours\n- **Protein** spread over 3–5 meals\n- **Soreness** is normal for 1–3 days; light movement helps more than rest\n- Train a muscle again when it’s no longer sore to the touch\n\nSharp or joint pain is different: back off and get it checked.`;
}

function plan(c: Ctx): string {
  const g = c.state.goals!;
  const f = c.foods;
  const pick = (re: RegExp) => f.find((x) => re.test(x.name));
  const de = c.state.settings.foodRegion === 'de';
  const meals: [string, (Food | undefined)[]][] = de
    ? [
        ['Breakfast', [pick(/^Haferflocken/), pick(/^Skyr/), pick(/^Heidelbeeren/)]],
        ['Lunch', [pick(/^Hähnchenbrust/), pick(/^Reis \(gekocht/), pick(/^Brokkoli/)]],
        ['Snack', [pick(/^Magerquark/), pick(/^Apfel/)]],
        ['Dinner', [pick(/^Lachsfilet/), pick(/^Kartoffeln/), pick(/^Blattsalat/)]],
      ]
    : [
        ['Breakfast', [pick(/^Rolled oats/), pick(/^Greek yogurt/), pick(/^Blueberries/)]],
        ['Lunch', [pick(/^Chicken breast, cooked/), pick(/^Brown rice/), pick(/^Broccoli/)]],
        ['Snack', [pick(/^Cottage cheese/), pick(/^Apple/)]],
        ['Dinner', [pick(/^Salmon/), pick(/^Sweet potato/), pick(/^Mixed salad/)]],
      ];
  let kcal = 0;
  let prot = 0;
  const lines = meals.map(([name, items]) => {
    const ok = items.filter(Boolean) as Food[];
    const k = ok.reduce((s, x) => s + x.nutrients.calories, 0);
    kcal += k;
    prot += ok.reduce((s, x) => s + x.nutrients.protein, 0);
    return `- **${name}**: ${ok.map((x) => `${x.name} (${serving(x)})`).join(', ')} · ${r(k)} kcal`;
  });
  const scale = g.calories / Math.max(1, kcal);
  return `A simple day for your ${g.calories.toLocaleString()} kcal goal:\n${lines.join('\n')}\n\nBase plan: ~${r(kcal)} kcal, ${r(prot)} g protein. ${scale > 1.1 ? `Scale portions up about ${Math.round((scale - 1) * 100)}% to hit your goal.` : scale < 0.9 ? `Trim portions about ${Math.round((1 - scale) * 100)}% to fit.` : 'That lands right on target.'}`;
}

function help(c: Ctx): string {
  return `I’m Buddy Coach. I work offline and know your numbers. Ask me things like:\n- “How am I doing today?”\n- “What should I eat for dinner?”\n- “How do I hit my protein?”\n- “What should I train today?”\n- “How do I rank up?”\n- “Plan my meals for tomorrow”\n\nRight now: ${r(Math.max(0, c.left.kcal))} kcal and ${r(Math.max(0, c.left.protein))} g protein left.`;
}

const INTENTS: [RegExp, (c: Ctx, q: string) => string][] = [
  [/rank|level|xp|stage|strong(er)?|stärker|stufe/, rank],
  [/plateau|stuck|stall|nicht mehr|keine fortschritte/, (c) => plateau(c.state.settings.units === 'us' ? '5 lb' : '2.5 kg')],
  [/(what|which).*(train|lift|workout|do today)|train today|trainieren|workout today|split|gym today/, trainToday],
  [/plan|tomorrow|morgen|meal prep/, plan],
  [/protein|eiweiß|eiweiss/, protein],
  [/eat|snack|dinner|lunch|breakfast|hungry|essen|hunger|frühstück|mittag|abendessen|meal idea/, whatToEat],
  [/creatin|supplement|whey|vitamin/, (_c, q) => supplements(q)],
  [/sore|recover|sleep|rest day|muskelkater|schlaf|erholung/, () => recovery()],
  [/water|wasser|hydrat|drink/, water],
  [/weight|lose|losing|abnehmen|gewicht|fat|scale/, weight],
  [/how am i|doing|today|calorie|kalorien|left|budget|übrig|summary|status/, howAmIDoing],
];

export function offlineReply(question: string, state: AppState, today = todayKey()): string {
  if (!state.goals || !state.profile) return 'Finish setting up your profile first, then ask me anything.';
  const q = question.toLowerCase();
  const c = context(state, today);
  for (const [re, fn] of INTENTS) if (re.test(q)) return fn(c, q);
  if (/^(hi|hey|hello|hallo|moin|servus|yo)\b/.test(q)) return `Hey${c.name ? ` ${c.name}` : ''}! ${help(c).split('\n\n')[0].replace('I’m Buddy Coach. ', '')}`;
  if (/thank|danke/.test(q)) return 'Anytime. Now go crush it. 💪';
  return help(c);
}
