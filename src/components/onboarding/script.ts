import type { Mood } from '@/components/pet/Face';
import type { GoalType, LookPref, TrainingPlan } from '@/lib/types';
import { planFromSplit } from '@/lib/plan';

/** A short pep line or quote shown under the pet's speech bubble. */
export interface Pep {
  text: string;
  by?: string;
}

export interface Pick<K extends string | number = string> {
  key: K;
  label: string;
  hint?: string;
  /** What the pet says when you pick this. */
  reply: string;
  mood: Mood;
}

export const MOTIVATIONS: Pick[] = [
  { key: 'strength', label: 'Feel stronger', hint: 'Lift more, carry more, move with ease', reply: 'Strong is a great reason. Every rep counts toward it.', mood: 'pumped' },
  { key: 'look', label: 'Look better', hint: 'Feel good in the mirror and in your clothes', reply: 'Confidence looks good on anyone. Let’s build it.', mood: 'wink' },
  { key: 'health', label: 'Be healthier', hint: 'Heart, blood work, the long game', reply: 'The long game. I respect that a lot.', mood: 'proud' },
  { key: 'energy', label: 'More energy', hint: 'Less tired, sharper through the day', reply: 'Good food and good sleep. We’ll get you there.', mood: 'happy' },
  { key: 'sport', label: 'Perform in a sport', hint: 'Faster, fitter, fewer injuries', reply: 'An athlete. I’ll keep up, promise.', mood: 'pumped' },
];

export const EXPERIENCE: Pick[] = [
  { key: 'new', label: 'Just starting', hint: 'New to the gym, or it’s been a long while', reply: 'Everyone starts somewhere. I’ll keep things simple.', mood: 'happy' },
  { key: 'some', label: 'Some experience', hint: 'I know my way around, not always consistent', reply: 'A solid base. Now we make it stick.', mood: 'wink' },
  { key: 'experienced', label: 'Experienced', hint: 'Training regularly for a year or more', reply: 'A veteran. I’ll try not to slow you down.', mood: 'pumped' },
];

export const OBSTACLES: Pick[] = [
  { key: 'time', label: 'Not enough time', hint: 'Work, family, life', reply: 'Then we keep it short and make it count.', mood: 'happy' },
  { key: 'motivation', label: 'Staying motivated', hint: 'Great starts, then it fades', reply: 'That’s what I’m here for. I don’t let people fade.', mood: 'proud' },
  { key: 'cravings', label: 'Food cravings', hint: 'Late-night snacks, sweets', reply: 'Honestly, same. We’ll plan for them, not fight them.', mood: 'hungry' },
  { key: 'knowhow', label: 'Knowing what to do', hint: 'Which exercises, how much to eat', reply: 'Easy fix. I’ll lay out every step for you.', mood: 'wink' },
];

export const SLEEP: Pick<number>[] = [
  { key: 5, label: '≤5', reply: 'Let’s work on that together. Recovery starts in bed.', mood: 'sleepy' },
  { key: 6, label: '6', reply: 'Close. Another hour would do wonders.', mood: 'sleepy' },
  { key: 7, label: '7', reply: 'Nice and steady. That’s the sweet spot.', mood: 'happy' },
  { key: 8, label: '8', reply: 'Look at you, well rested. Muscles love that.', mood: 'wink' },
  { key: 9, label: '9+', reply: 'A true sleep champion. I’m a little jealous.', mood: 'proud' },
];

export const GOAL_REPLY: Record<GoalType, { reply: string; mood: Mood }> = {
  lose: { reply: 'Lighter and stronger. We’ll go at a pace you can keep.', mood: 'happy' },
  maintain: { reply: 'Hold the line and eat better. Smart choice.', mood: 'wink' },
  gain: { reply: 'Building muscle? Now you’re speaking my language.', mood: 'pumped' },
};

export const ACTIVITY_REPLY: Record<string, string> = {
  sedentary: 'No judgment. We’ll get you moving little by little.',
  light: 'A good start. We can build from here.',
  moderate: 'Nicely active. That makes my job easier.',
  active: 'You don’t sit still, do you? Love it.',
  very_active: 'An athlete. Fuel matters a lot for you.',
};

export const DAYS_REPLY: Record<number, string> = {
  2: 'Two good days beat five skipped ones.',
  3: 'Three full-body days. A classic for a reason.',
  4: 'Four days, upper and lower. Balanced and strong.',
  5: 'Five days. One muscle group a day, done properly.',
  6: 'Six days. Push, pull, legs, twice. Bold.',
};

/** What the pet says for a training choice, keyed "part:value". */
export const TRAINING_REPLY: Record<string, { reply: string; mood: Mood }> = {
  'goal:muscle': { reply: 'Muscle it is. Steady volume, good form.', mood: 'pumped' },
  'goal:strength': { reply: 'Heavy and focused. I’ll give you time to rest between sets.', mood: 'pumped' },
  'goal:fitness': { reply: 'A bit of everything. Smart and sustainable.', mood: 'happy' },
  'goal:fat': { reply: 'Higher reps, shorter rests. We’ll keep you moving.', mood: 'happy' },
  'place:gym': { reply: 'The full toolbox. Nice.', mood: 'wink' },
  'place:home': { reply: 'Dumbbells at home. I’ll pick moves that fit.', mood: 'happy' },
  'place:bodyweight': { reply: 'No gear, no excuses. I like it.', mood: 'proud' },
  'minutes:30': { reply: 'Short and sharp. I’ll keep it to the essentials.', mood: 'happy' },
  'minutes:45': { reply: 'Forty-five minutes. Plenty to get real work done.', mood: 'happy' },
  'minutes:60': { reply: 'A full hour. Room for everything.', mood: 'pumped' },
  'minutes:75': { reply: 'Long sessions. You’re serious about this.', mood: 'pumped' },
};

export const LOOK_REPLY: Record<LookPref, { reply: string; mood: Mood }> = {
  colorful: { reply: 'Bright and lively. Every number gets its own color.', mood: 'happy' },
  simple: { reply: 'Clean and calm. Less color, same me.', mood: 'wink' },
};

/**
 * Short edit flow when a profile exists, the full new-user flow otherwise,
 * or when the route asks for it with `?fresh=1` ("Redo onboarding").
 */
export function onboardingMode(hasProfile: boolean, fresh?: string | string[]): 'new' | 'edit' {
  const f = Array.isArray(fresh) ? fresh[0] : fresh;
  const forced = f === '1' || f === 'true';
  return hasProfile && !forced ? 'edit' : 'new';
}

/** Which preset split fits how many days you can train. */
export function splitForDays(days: number): string {
  if (days <= 3) return 'full3';
  if (days === 4) return 'ul';
  if (days === 5) return 'bro';
  return 'ppl';
}

/** A starting training plan for `days` a week, beginning on `since`. */
export function planForDays(days: number, since: string): TrainingPlan {
  const split = splitForDays(days);
  // Two days: full body Monday and Thursday.
  return days <= 2 ? planFromSplit(split, since, ['full', null, null, 'full', null, null, null]) : planFromSplit(split, since);
}

/** Pep lines per step key. The first shows at once; the rest rotate in. */
export const PEP: Record<string, Pep[]> = {
  hello: [
    { text: 'A journey of a thousand miles begins with a single step.', by: 'Lao Tzu' },
    { text: 'You showed up. That’s the hardest part, and it’s done.' },
  ],
  petName: [
    { text: 'Every good team starts with a name.' },
    { text: 'Alone we can do so little; together we can do so much.', by: 'Helen Keller' },
  ],
  body: [
    { text: 'Numbers are a starting point, not a verdict.' },
    { text: 'Know where you stand, then take the next step.' },
  ],
  activity: [
    { text: 'Movement is a gift you give your future self.' },
    { text: 'Little by little, one travels far.', by: 'Spanish proverb' },
  ],
  goal: [
    { text: 'A goal gives every day a direction.' },
    { text: 'Pick where you’re headed. I’ll handle the map.' },
  ],
  motivation: [
    { text: 'Know your why and the how gets easier.' },
    { text: 'He who has health has hope, and he who has hope has everything.', by: 'Arabian proverb' },
  ],
  experience: [
    { text: 'Every expert was once a beginner.' },
    { text: 'Well begun is half done.', by: 'Aristotle' },
  ],
  days: [
    { text: 'Consistency beats intensity. Pick what you can keep.' },
    { text: 'Energy and persistence conquer all things.', by: 'Benjamin Franklin' },
  ],
  training: [
    { text: 'The best workout is the one you actually do.' },
    { text: 'Train where you are, with what you have.' },
  ],
  obstacle: [
    { text: 'Name the obstacle and it gets smaller.' },
    { text: 'Fall seven times, stand up eight.', by: 'Japanese proverb' },
  ],
  sleep: [
    { text: 'Rest is not idleness.', by: 'John Lubbock' },
    { text: 'Muscles are built in the gym and finished in bed.' },
  ],
  look: [
    { text: 'Make it yours. You’ll open it every day.' },
    { text: 'Simplicity is the ultimate sophistication.', by: 'Leonardo da Vinci' },
  ],
  plan: [
    { text: 'Small steps, every day. That’s the whole secret.' },
    { text: 'The best time to start was yesterday. The next best is today.' },
  ],
};
