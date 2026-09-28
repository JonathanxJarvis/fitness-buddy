/*
 * Pet collection and chest drops.
 *
 * Every chest pays out XP; that is the reward you work for. On top of that a
 * chest occasionally (about 1 in 15 daily chests, a bit more often for weekly
 * and world chests) also drops a collectible: a pet, an outfit or an aura.
 * Higher ranks, longer streaks and Pro nudge the odds up a little, and every
 * chest that comes up empty makes the next one slightly luckier.
 *
 * App Store note (guideline 3.1.1 / loot boxes): chests are only ever earned by
 * logging, training and ranking up. They are never sold, cannot be bought with
 * real money or any purchasable currency, and the odds are shown in the app
 * (Pets > Collection). Pro changes the odds by a small published amount only.
 *
 * Everything here is pure and seeded, so a given chest always rolls the same.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'pet' | 'skin' | 'aura';
/** Starter: everyone has it. Pro: included with Pro (and can drop). Drop: chests only. */
export type ItemSource = 'starter' | 'pro' | 'drop';

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Understated collectible colors: slate, cobalt, violet, champagne. */
export const RARITY: Record<Rarity, { label: string; color: string; glow: string; bonusXp: number }> = {
  common: { label: 'Common', color: '#9AA5AE', glow: '#D5DCE1', bonusXp: 25 },
  rare: { label: 'Rare', color: '#4C9BE8', glow: '#A9D2FF', bonusXp: 50 },
  epic: { label: 'Epic', color: '#A46BF5', glow: '#D8C2FF', bonusXp: 100 },
  legendary: { label: 'Legendary', color: '#E3B04B', glow: '#FFE3A1', bonusXp: 200 },
};

export type Species =
  | 'kettle'
  | 'shaker'
  | 'egg'
  | 'dumbbell'
  | 'avo'
  | 'broc'
  | 'plate'
  | 'flame'
  | 'bottle'
  | 'berry'
  | 'brew'
  | 'medball'
  | 'tempo'
  | 'kicks'
  | 'quartz'
  | 'atlas'
  | 'luna'
  | 'nova';

export interface PetDef {
  key: Species;
  name: string;
  kind: string;
  /** Kept for older screens: true for the pets Pro unlocks outright. */
  pro: boolean;
  blurb: string;
  rarity: Rarity;
  source: ItemSource;
}

/** Every pet you can collect, with its default name and personality. */
export const PETS: PetDef[] = [
  { key: 'kettle', name: 'Kettle', kind: 'kettlebell', pro: false, rarity: 'common', source: 'starter', blurb: 'Solid, steady and always up for one more swing.' },
  { key: 'shaker', name: 'Shaky', kind: 'protein shaker', pro: false, rarity: 'common', source: 'starter', blurb: 'Bubbly hype machine who never skips post-workout.' },
  { key: 'egg', name: 'Eggbert', kind: 'egg', pro: false, rarity: 'common', source: 'starter', blurb: 'Small, sunny and packed with protein-powered optimism.' },
  { key: 'avo', name: 'Avo', kind: 'avocado', pro: true, rarity: 'common', source: 'pro', blurb: 'Chill, full of good fats and zero stress about rest days.' },
  { key: 'broc', name: 'Broc', kind: 'broccoli', pro: true, rarity: 'common', source: 'pro', blurb: 'Tough-love veggie who will ask if you ate your greens.' },
  { key: 'dumbbell', name: 'Dumbo', kind: 'dumbbell', pro: true, rarity: 'rare', source: 'pro', blurb: 'A gentle giant who believes in balanced reps on both sides.' },
  { key: 'plate', name: 'Plato', kind: 'weight plate', pro: true, rarity: 'rare', source: 'pro', blurb: 'Deep thinker who knows every plate counts.' },
  { key: 'flame', name: 'Blaze', kind: 'fire spirit', pro: true, rarity: 'epic', source: 'pro', blurb: 'A little fire spirit that burns hot for every streak.' },
  { key: 'bottle', name: 'Hydro', kind: 'water bottle', pro: false, rarity: 'common', source: 'drop', blurb: 'Cool-headed. Reminds you to sip between sets.' },
  { key: 'berry', name: 'Bleu', kind: 'blueberry', pro: false, rarity: 'common', source: 'drop', blurb: 'Tiny, tart and quietly full of antioxidants.' },
  { key: 'brew', name: 'Brew', kind: 'espresso', pro: false, rarity: 'common', source: 'drop', blurb: 'Two shots in, zero chill. Mornings are its cardio.' },
  { key: 'medball', name: 'Slam', kind: 'medicine ball', pro: false, rarity: 'rare', source: 'drop', blurb: 'Throws its weight around. In a good way.' },
  { key: 'tempo', name: 'Tempo', kind: 'stopwatch', pro: false, rarity: 'rare', source: 'drop', blurb: 'Times your rest to the second. Mostly.' },
  { key: 'kicks', name: 'Kicks', kind: 'running shoe', pro: false, rarity: 'rare', source: 'drop', blurb: 'Laces tight and always one step ahead.' },
  { key: 'quartz', name: 'Quartz', kind: 'crystal', pro: false, rarity: 'epic', source: 'drop', blurb: 'Formed under pressure. Just like you.' },
  { key: 'atlas', name: 'Atlas', kind: 'stone guardian', pro: false, rarity: 'epic', source: 'drop', blurb: 'Ancient, patient, carries the world on leg day.' },
  { key: 'luna', name: 'Luna', kind: 'moon spirit', pro: false, rarity: 'epic', source: 'drop', blurb: 'Keeps watch over rest days and recovery nights.' },
  { key: 'nova', name: 'Nova', kind: 'comet', pro: false, rarity: 'legendary', source: 'drop', blurb: 'Blazes across the sky once in a very long while.' },
];

export interface SkinDef {
  name: string;
  body: string;
  shade: string;
  dark: string;
  rarity: Rarity;
  source: ItemSource;
  /** Metallic sheen over the body. */
  sheen?: boolean;
}

/** Outfits: main body colors. 'classic' is each pet's own look. */
export const SKINS: Record<string, SkinDef> = {
  classic: { name: 'Classic', body: '#1F4A36', shade: '#2E6B4E', dark: '#1C3A2C', rarity: 'common', source: 'starter' },
  gold: { name: 'Gold', body: '#9A6B12', shade: '#E0A82E', dark: '#6E4B0B', rarity: 'rare', source: 'pro', sheen: true },
  midnight: { name: 'Midnight', body: '#1E2250', shade: '#3A43A0', dark: '#151837', rarity: 'rare', source: 'pro' },
  cherry: { name: 'Cherry', body: '#6E1830', shade: '#B2304F', dark: '#4F1022', rarity: 'rare', source: 'pro' },
  neon: { name: 'Neon', body: '#0F2A2A', shade: '#19D3C5', dark: '#0A1C1C', rarity: 'epic', source: 'pro' },
  sage: { name: 'Sage', body: '#4F6B57', shade: '#8FB39A', dark: '#34483A', rarity: 'common', source: 'drop' },
  sand: { name: 'Sand', body: '#9C7A52', shade: '#D9BC92', dark: '#6B5236', rarity: 'common', source: 'drop' },
  slate: { name: 'Slate', body: '#3E4852', shade: '#76838F', dark: '#2A3138', rarity: 'common', source: 'drop' },
  ember: { name: 'Ember', body: '#7A2412', shade: '#E2622E', dark: '#50170B', rarity: 'rare', source: 'drop' },
  glacier: { name: 'Glacier', body: '#2B5874', shade: '#8CCBE8', dark: '#1B3A4E', rarity: 'rare', source: 'drop' },
  carbon: { name: 'Carbon', body: '#1B1D21', shade: '#4A5059', dark: '#0E0F12', rarity: 'epic', source: 'drop', sheen: true },
  aurora: { name: 'Aurora', body: '#23285E', shade: '#3FD9B4', dark: '#151839', rarity: 'epic', source: 'drop' },
  chrome: { name: 'Chrome', body: '#7F8B97', shade: '#F1F5F9', dark: '#4A535C', rarity: 'legendary', source: 'drop', sheen: true },
  holo: { name: 'Holo', body: '#4A3F9A', shade: '#FF9BD2', dark: '#2A2360', rarity: 'legendary', source: 'drop', sheen: true },
};

export type AuraKey = 'none' | 'chalk' | 'bubbles' | 'pulse' | 'sparks' | 'frost' | 'embers' | 'orbit' | 'halo' | 'nebula';

export interface AuraDef {
  name: string;
  blurb: string;
  color: string;
  rarity: Rarity;
  source: ItemSource;
}

/** Effects around your pet. Chest drops only. */
export const AURAS: Record<AuraKey, AuraDef> = {
  none: { name: 'None', blurb: 'Just your pet.', color: '#9AA5AE', rarity: 'common', source: 'starter' },
  chalk: { name: 'Chalk dust', blurb: 'A puff of chalk before every lift.', color: '#E8ECEF', rarity: 'common', source: 'drop' },
  bubbles: { name: 'Fizz', blurb: 'Sparkling-water energy.', color: '#8FD3F5', rarity: 'common', source: 'drop' },
  pulse: { name: 'Heartbeat', blurb: 'A calm resting pulse.', color: '#F07A8C', rarity: 'common', source: 'drop' },
  sparks: { name: 'Sparks', blurb: 'Static from a hard set.', color: '#FFD66B', rarity: 'rare', source: 'drop' },
  frost: { name: 'Ice bath', blurb: 'Cold-plunge recovery, on tap.', color: '#A9E4FF', rarity: 'rare', source: 'drop' },
  embers: { name: 'Embers', blurb: 'Still glowing after the workout.', color: '#FF8A3D', rarity: 'epic', source: 'drop' },
  orbit: { name: 'Orbit', blurb: 'Gravity bends a little around you.', color: '#9FB6FF', rarity: 'epic', source: 'drop' },
  halo: { name: 'Halo', blurb: 'For the truly consistent.', color: '#FFE3A1', rarity: 'legendary', source: 'drop' },
  nebula: { name: 'Nebula', blurb: 'A whole galaxy of gains.', color: '#C58BFF', rarity: 'legendary', source: 'drop' },
};

export interface LootItem {
  id: string;
  kind: ItemKind;
  key: string;
  name: string;
  rarity: Rarity;
  source: ItemSource;
}

/** Everything collectible, in display order. Item ids look like "pet:nova", "skin:chrome", "aura:halo". */
export const CATALOG: LootItem[] = [
  ...PETS.map((p) => ({ id: `pet:${p.key}`, kind: 'pet' as const, key: p.key, name: p.name, rarity: p.rarity, source: p.source })),
  ...Object.entries(SKINS).map(([key, s]) => ({ id: `skin:${key}`, kind: 'skin' as const, key, name: s.name, rarity: s.rarity, source: s.source })),
  ...(Object.entries(AURAS) as [AuraKey, AuraDef][]).map(([key, a]) => ({ id: `aura:${key}`, kind: 'aura' as const, key, name: a.name, rarity: a.rarity, source: a.source })),
];

export const itemById = (id: string): LootItem | undefined => CATALOG.find((i) => i.id === id);

/** Items that can come out of a chest (everything but the starters). */
export const DROPPABLE = CATALOG.filter((i) => i.source !== 'starter');

// ---------- ownership ----------

export interface LootState {
  /** Item ids won from chests. */
  owned: string[];
  /** Chests opened in a row without a drop (a little pity luck). */
  dry: number;
  /** The most recent chest, for the opening animation. */
  last?: ChestResult;
  /** Item drops, newest last (capped). */
  history?: { item: string; date: string; claim: string; dup: boolean }[];
}

export const EMPTY_LOOT: LootState = { owned: [], dry: 0 };

/** Whether you have an item: starters for all, Pro items with Pro, anything won from a chest. */
export function hasItem(id: string, pro: boolean, owned: string[] = []): boolean {
  const item = itemById(id);
  if (!item) return false;
  return item.source === 'starter' || (pro && item.source === 'pro') || owned.includes(id);
}

// ---------- odds ----------

export type ChestKind = 'daily' | 'weekly' | 'world';

export const CHEST_LABEL: Record<ChestKind, string> = { daily: 'Daily chest', weekly: 'Weekly chest', world: 'World chest' };

/** Claim ids that are chests: the daily chest, the weekly challenge and path chests. */
export function chestKind(claimId: string): ChestKind | null {
  if (claimId === 'chest') return 'daily';
  if (claimId === 'week') return 'weekly';
  if (claimId.startsWith('path:')) return 'world';
  return null;
}

const BASE_CHANCE: Record<ChestKind, number> = { daily: 0.06, weekly: 0.1, world: 0.12 };

export interface Luck {
  /** Rank tier index (0 Rookie … 8 Titan). */
  tier: number;
  /** Current day streak. */
  streak: number;
  pro: boolean;
  /** Chests in a row that came up empty. */
  dry: number;
}

/** Chance that a chest also drops an item (0–1). */
export function dropChance(kind: ChestKind, luck: Luck): number {
  const rank = Math.min(0.02, Math.max(0, luck.tier) * 0.0025);
  const streak = (Math.min(30, Math.max(0, luck.streak)) / 30) * 0.01;
  const pro = luck.pro ? 0.01 : 0;
  const pity = Math.min(0.04, Math.max(0, luck.dry) * 0.005);
  return Math.min(0.2, BASE_CHANCE[kind] + rank + streak + pro + pity);
}

/** Relative rarity weights once an item drops; higher tiers tilt toward rarer items. */
export function rarityWeights(tier: number): Record<Rarity, number> {
  const t = Math.max(0, Math.min(8, tier));
  return { common: 62 - t * 1.5, rare: 28 + t * 0.8, epic: 9 + t * 0.6, legendary: 1 + t * 0.1 };
}

/** Overall odds per rarity for one chest (0–1 each), for the odds table. */
export function chestOdds(kind: ChestKind, luck: Luck): { drop: number; rarity: Record<Rarity, number> } {
  const drop = dropChance(kind, luck);
  const w = rarityWeights(luck.tier);
  const total = RARITIES.reduce((n, r) => n + w[r], 0);
  const rarity = Object.fromEntries(RARITIES.map((r) => [r, (drop * w[r]) / total])) as Record<Rarity, number>;
  return { drop, rarity };
}

// ---------- seeded RNG ----------

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for dice. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- rolling ----------

export interface ChestResult {
  claim: string;
  date: string;
  kind: ChestKind;
  /** Item id, when the chest dropped something. */
  item?: string;
  /** You already had it: it turns into bonus XP instead. */
  dup?: boolean;
  bonusXp: number;
  /** The drop chance this chest had. */
  chance: number;
  at: number;
}

/** Roll one chest. Pure: the same inputs always give the same result. */
export function rollChest(opts: { claim: string; date: string; kind: ChestKind; luck: Luck; owned: string[]; at?: number }): ChestResult {
  const { claim, date, kind, luck, owned } = opts;
  const r = rng(hashSeed(`${claim}|${date}|${luck.dry}|${owned.length}`));
  const chance = dropChance(kind, luck);
  const base: ChestResult = { claim, date, kind, bonusXp: 0, chance, at: opts.at ?? 0 };
  if (r() >= chance) return base;

  const w = rarityWeights(luck.tier);
  let pick = r() * RARITIES.reduce((n, k) => n + w[k], 0);
  let rarity: Rarity = 'common';
  for (const k of RARITIES) {
    pick -= w[k];
    if (pick < 0) {
      rarity = k;
      break;
    }
  }
  // Within a rarity, things you don't have yet are three times as likely.
  const pool = DROPPABLE.filter((i) => i.rarity === rarity);
  const weight = (i: LootItem) => (hasItem(i.id, luck.pro, owned) ? 1 : 3);
  let n = r() * pool.reduce((s, i) => s + weight(i), 0);
  let item = pool[pool.length - 1];
  for (const i of pool) {
    n -= weight(i);
    if (n < 0) {
      item = i;
      break;
    }
  }
  const dup = hasItem(item.id, luck.pro, owned);
  return { ...base, item: item.id, dup, bonusXp: dup ? RARITY[rarity].bonusXp : 0 };
}

/** Apply a chest result to the collection. */
export function applyChest(loot: LootState | undefined, res: ChestResult): LootState {
  const cur = loot ?? EMPTY_LOOT;
  if (!res.item) return { ...cur, dry: cur.dry + 1, last: res };
  const owned = res.dup || cur.owned.includes(res.item) ? cur.owned : [...cur.owned, res.item];
  const history = [...(cur.history ?? []), { item: res.item, date: res.date, claim: res.claim, dup: !!res.dup }].slice(-50);
  return { owned, dry: 0, last: res, history };
}
