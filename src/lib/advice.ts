import { addDays, fromKey } from './dates';
import { REGION_LABEL, type MuscleRegion } from './exerciseInfo';
import { e1rmSessions, liftSummary, mainLifts, SET_TARGET, weeklyMuscleVolume } from './stats';
import { doneSets, findExercise } from './training';
import { formatWeight } from './units';
import type { AppState } from './types';

export type AdviceTone = 'good' | 'tip' | 'warn';

export interface Advice {
  id: string;
  tone: AdviceTone;
  icon: string;
  title: string;
  body: string;
  action?: { label: string; kind: 'train' | 'food' | 'recovery' };
}

type AdviceState = Pick<AppState, 'workouts' | 'profile' | 'goals' | 'weights' | 'settings' | 'customExercises'> & {
  proteinByDay?: Record<string, number>;
};

// Big muscles people most often under- or over-train, in the order advice should mention them.
const KEY_MUSCLES: MuscleRegion[] = ['chest', 'lats', 'upper-back', 'quads', 'hamstrings', 'glutes', 'side-delts'];

const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

/** Up to `max` short, personal tips from your own training, food and weight data, most useful first. */
export function personalAdvice(state: AdviceState, today: string, max = 4): Advice[] {
  const out: Advice[] = [];
  const units = state.settings.units;
  const w = (kg: number) => formatWeight(kg, units, 0);
  const custom = state.customExercises ?? [];
  const trained = state.workouts.filter((x) => doneSets(x) > 0 && x.date <= today);

  const last = trained.reduce<string | undefined>((d, x) => (!d || x.date > d ? x.date : d), undefined);
  if (last) {
    const gap = daysBetween(last, today);
    if (gap >= 6) {
      out.push({ id: 'comeback', tone: 'warn', icon: 'time-outline', title: `${gap} days since your last workout`, body: 'A short session today keeps your streak of progress alive. Even 30 minutes counts.', action: { label: 'Start a workout', kind: 'train' } });
    }
  }

  const lifts = mainLifts(state.workouts, addDays(today, -56), 4, 3);
  for (const id of lifts) {
    const s = liftSummary(id, state.workouts, today);
    const name = findExercise(id, custom)?.name ?? id;
    if (!s || s.change === undefined) continue;
    const recent = e1rmSessions(id, state.workouts).filter((x) => x.date >= addDays(today, -42));
    if (s.change <= 0 && recent.length >= 4) {
      out.push({ id: `stall:${id}`, tone: 'tip', icon: 'pause-circle-outline', title: `${name} has stalled`, body: `Stuck around ${w(s.current)} (estimated max) for a few weeks. Try one lighter week, then switch to sets of 6 to 8 with a little more weight.` });
    } else if (s.change >= 2.5) {
      out.push({ id: `up:${id}`, tone: 'good', icon: 'trending-up', title: `${name} is up ${w(s.change)}`, body: 'Stronger than 4 weeks ago. What you’re doing works: keep the same plan.' });
    }
  }

  const vol = weeklyMuscleVolume(state.workouts, today, 4, custom);
  if (vol.weeksCounted >= 2) {
    const byRegion = new Map(vol.muscles.map((m) => [m.region, m]));
    const low = KEY_MUSCLES.find((r) => (byRegion.get(r)?.average ?? 0) < SET_TARGET.low);
    const high = KEY_MUSCLES.find((r) => (byRegion.get(r)?.average ?? 0) > SET_TARGET.high);
    if (low) {
      const avg = Math.round(byRegion.get(low)?.average ?? 0);
      out.push({ id: `low:${low}`, tone: 'tip', icon: 'add-circle-outline', title: `More sets for ${REGION_LABEL[low].toLowerCase()}`, body: `About ${avg} sets a week. Muscles grow best with 10 to 20, so add ${Math.max(3, SET_TARGET.low - avg)} sets spread over your week.` });
    }
    if (high) {
      const avg = Math.round(byRegion.get(high)?.average ?? 0);
      out.push({ id: `high:${high}`, tone: 'warn', icon: 'remove-circle-outline', title: `${REGION_LABEL[high]} may be overworked`, body: `About ${avg} sets a week. Past 20, recovery suffers more than you gain. Cut a few and use the time elsewhere.`, action: { label: 'See recovery', kind: 'recovery' } });
    }
  }

  const goals = state.goals;
  if (goals && state.proteinByDay) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i - 1)).filter((d) => (state.proteinByDay?.[d] ?? 0) > 0);
    if (days.length >= 3) {
      const avg = days.reduce((s, d) => s + (state.proteinByDay?.[d] ?? 0), 0) / days.length;
      if (avg < goals.protein * 0.85) {
        out.push({ id: 'protein', tone: 'tip', icon: 'nutrition-outline', title: 'Protein is running low', body: `You average ${Math.round(avg)} g of your ${goals.protein} g. A skyr, quark or shake after training closes most of the gap.`, action: { label: 'Log food', kind: 'food' } });
      } else if (avg >= goals.protein * 0.95) {
        out.push({ id: 'protein-ok', tone: 'good', icon: 'checkmark-circle-outline', title: 'Protein is on point', body: `${Math.round(avg)} g a day on average. That’s exactly what your muscles need.` });
      }
    }
  }

  const goal = state.profile?.goal;
  const weighIns = Object.keys(state.weights).filter((d) => d > addDays(today, -15) && d <= today).sort();
  if (goal && goal !== 'maintain' && weighIns.length >= 3 && daysBetween(weighIns[0], weighIns[weighIns.length - 1]) >= 10) {
    const change = state.weights[weighIns[weighIns.length - 1]] - state.weights[weighIns[0]];
    if (goal === 'lose' && change >= 0) {
      out.push({ id: 'weight-flat', tone: 'tip', icon: 'scale-outline', title: 'Weight hasn’t moved in 2 weeks', body: 'Eat about 150 kcal less a day or add 2,000 steps. Small changes are easier to keep.' });
    } else if (goal === 'gain' && change <= 0) {
      out.push({ id: 'weight-flat', tone: 'tip', icon: 'scale-outline', title: 'Weight hasn’t moved in 2 weeks', body: 'Add about 150 kcal a day, like a banana with peanut butter, to keep building.' });
    } else {
      out.push({ id: 'weight-ok', tone: 'good', icon: 'scale-outline', title: 'Weight is heading the right way', body: `${change > 0 ? '+' : ''}${formatWeight(change, units)} in 2 weeks. Steady and sustainable.` });
    }
  }

  if (!out.length) {
    out.push(
      trained.length
        ? { id: 'steady', tone: 'good', icon: 'sparkles-outline', title: 'Nothing to fix right now', body: 'Your training and eating look balanced. Keep showing up and this will fill with new tips as you go.' }
        : { id: 'start', tone: 'tip', icon: 'sparkles-outline', title: 'Your advice starts here', body: 'Log a few workouts and meals. After your first week you’ll get tips made from your own numbers.', action: { label: 'Start a workout', kind: 'train' } },
    );
  }

  const rank: Record<AdviceTone, number> = { warn: 0, tip: 1, good: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, max);
}
