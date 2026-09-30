import { stateProgression, TIERS } from './progression';
import { activeDays, streakInfo } from './quests';
import { applyChest, chestKind, EMPTY_LOOT, rollChest, type Luck } from './loot';
import type { AppState, QuestLogEntry } from './types';

/** Your current luck: rank tier, level, streak, Pro and pity. */
export function luckFor(state: AppState, date: string, pro: boolean): Luck {
  let tier = 0;
  let streak = 0;
  let level = 1;
  if (state.profile) {
    const p = stateProgression(state, date);
    tier = Math.max(0, TIERS.findIndex((t) => t.key === p.stage.tier.key));
    level = p.level;
  }
  try {
    streak = streakInfo(activeDays(state, date), date).streak;
  } catch {
    streak = 0;
  }
  return { tier, streak, pro, dry: state.loot?.dry ?? 0, level };
}

/**
 * Claiming a chest reward: roll it, add any item to the collection and turn
 * a duplicate into bonus XP. Non-chest claims pass through untouched.
 */
export function claimWithLoot(state: AppState, entry: QuestLogEntry, pro: boolean, at = Date.now()): { entry: QuestLogEntry; loot: AppState['loot'] } {
  const kind = chestKind(entry.id);
  if (!kind) return { entry, loot: state.loot };
  const loot = state.loot ?? EMPTY_LOOT;
  const res = rollChest({ claim: entry.id, date: entry.date, kind, luck: luckFor(state, entry.date, pro), owned: loot.owned, at });
  return { entry: res.bonusXp ? { ...entry, xp: entry.xp + res.bonusXp } : entry, loot: applyChest(loot, res) };
}
