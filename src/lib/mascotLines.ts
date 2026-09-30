import type { Mood } from '@/components/Mascot';

export type MascotEvent =
  | 'workoutStart'
  | 'setDone'
  | 'workoutDone'
  | 'pr'
  | 'levelUp'
  | 'rankUp'
  | 'meal'
  | 'proteinHit'
  | 'water'
  | 'streak'
  | 'quest'
  | 'chest'
  | 'hello';

/**
 * Kettle's voice: a small, loyal, slightly dramatic gym buddy. Short lines that
 * fit a phone corner. {name}, {rank}, {level}, {n} and {food} get filled in.
 */
const LINES: Record<MascotEvent, { mood: Mood; lines: string[] }> = {
  workoutStart: {
    mood: 'pumped',
    lines: [
      'Let’s go, {name}. Be strong!',
      'Chalk up. We lift today.',
      'Phone down after this. Iron time.',
      'I stretched. Kind of. Let’s move!',
      'Warm-up sets count. Don’t skip ’em.',
      'Today’s you vs. last week’s you. Fight!',
      '{rank} doesn’t rank itself up. Go!',
    ],
  },
  setDone: {
    mood: 'happy',
    lines: ['Clean rep. Next one.', 'That’s a set. Breathe.', 'Smooth. Stay tight.', 'Log it, rest it, own it.', 'You made that look light.', 'Stronger than you think.'],
  },
  workoutDone: {
    mood: 'proud',
    lines: ['Session done. Proud of you, {name}.', 'That’s {n} sets in the bank.', 'Protein + sleep now. Coach’s orders.', 'You showed up. That’s the whole secret.', 'Another brick in the wall.'],
  },
  pr: {
    mood: 'pumped',
    lines: ['NEW PR! I’m telling everyone.', 'Personal record! Who ARE you?!', 'PR alert. Screenshot this.', 'That PR was personal. Respect.'],
  },
  levelUp: {
    mood: 'proud',
    lines: ['LEVEL {level}! We’re climbing.', 'Level {level} unlocked. Ding!', 'Level {level}. The grind pays.'],
  },
  rankUp: {
    mood: 'pumped',
    lines: ['RANK UP! Welcome to {rank}.', '{rank}! New badge, new you.', 'You’re {rank} now. Act like it.'],
  },
  meal: {
    mood: 'happy',
    lines: ['Logged! Your future self says thanks.', 'Fuel in. Gains loading…', 'Tracked. That’s discipline.', 'Nice. {food} noted.', 'Every log counts. Bonus points!', 'Mmm. Wish I had a mouth for {food}.'],
  },
  proteinHit: {
    mood: 'proud',
    lines: ['Protein goal HIT. Muscles: fed.', 'Protein done for today. Chef’s kiss.', 'Protein target smashed. Growing!'],
  },
  water: {
    mood: 'wink',
    lines: ['Hydrated lifters lift heavier.', 'Glug glug. Good choice.', 'Water logged. Stay juicy.'],
  },
  streak: {
    mood: 'pumped',
    lines: ['{n}-day streak! Don’t break the chain.', '{n} days straight. Unstoppable.'],
  },
  quest: {
    mood: 'proud',
    lines: ['Quest done! XP in the bag.', 'Quest cleared. You’re on a roll, {name}.', 'Check! One less thing, one more level.'],
  },
  chest: {
    mood: 'pumped',
    lines: ['Chest opened! Shiny XP!', 'Loot! I love loot.', 'Treasure time. You earned it.'],
  },
  hello: {
    mood: 'wink',
    lines: ['Hey {name}! Ready when you are.', 'Back for more? Love it.', 'I kept your spot warm.'],
  },
};

const last: Partial<Record<MascotEvent, number>> = {};

export function mascotLine(event: MascotEvent, vars: Record<string, string | number> = {}): { text: string; mood: Mood } {
  const { lines, mood } = LINES[event];
  let i = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && i === last[event]) i = (i + 1) % lines.length;
  last[event] = i;
  const text = lines[i].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? (k === 'name' ? 'champ' : '')));
  return { text, mood };
}
