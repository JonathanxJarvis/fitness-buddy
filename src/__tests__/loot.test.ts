import { describe, expect, it } from '@jest/globals';
import { applyChest, CATALOG, chestKind, chestOdds, chestPool, dropChance, hasItem, rankRewards, rarityWeights, reachTier, rollChest, RARITIES, type Luck } from '@/lib/loot';
import { initialState, reducer } from '@/store/reducer';
import { mascotSkin, petSpecies } from '@/lib/pro';
import type { AppState } from '@/lib/types';

const luck: Luck = { tier: 0, streak: 0, pro: false, dry: 0 };

describe('chest odds', () => {
  it('drops an item only occasionally, a bit more for weekly and world chests', () => {
    expect(dropChance('daily', luck)).toBeCloseTo(0.06);
    expect(dropChance('weekly', luck)).toBeGreaterThan(dropChance('daily', luck));
    expect(dropChance('world', luck)).toBeGreaterThan(dropChance('weekly', luck));
  });

  it('grows with rank, streak, Pro and bad luck, but stays capped', () => {
    const better = dropChance('daily', { tier: 8, streak: 30, pro: true, dry: 20 });
    expect(better).toBeGreaterThan(dropChance('daily', luck));
    expect(better).toBeLessThanOrEqual(0.2);
  });

  it('keeps legendary drops well under 1% of chests even at the top', () => {
    const top = chestOdds('world', { tier: 8, streak: 30, pro: true, dry: 20 });
    expect(top.rarity.legendary).toBeLessThan(0.01);
    const sum = RARITIES.reduce((n, r) => n + top.rarity[r], 0);
    expect(sum).toBeCloseTo(top.drop);
    expect(rarityWeights(8).legendary).toBeGreaterThan(rarityWeights(0).legendary);
  });
});

describe('rolling chests', () => {
  it('is deterministic for the same chest', () => {
    const a = rollChest({ claim: 'path:4', date: '2026-09-28', kind: 'world', luck, owned: [] });
    const b = rollChest({ claim: 'path:4', date: '2026-09-28', kind: 'world', luck, owned: [] });
    expect(a).toEqual(b);
  });

  it('matches the published odds over many chests', () => {
    let drops = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const r = rollChest({ claim: 'chest', date: `d${i}`, kind: 'daily', luck, owned: [] });
      if (r.item) {
        drops++;
        expect(['pro', 'drop']).toContain(CATALOG.find((c) => c.id === r.item)?.source);
      }
    }
    expect(drops / n).toBeGreaterThan(0.04);
    expect(drops / n).toBeLessThan(0.08);
  });

  it('turns a duplicate into bonus XP and a new item into the collection', () => {
    // Find a seed that drops something.
    let res = rollChest({ claim: 'path:1', date: 'x0', kind: 'world', luck: { ...luck, dry: 8 }, owned: [] });
    for (let i = 1; !res.item; i++) res = rollChest({ claim: 'path:1', date: `x${i}`, kind: 'world', luck: { ...luck, dry: 8 }, owned: [] });
    expect(res.dup).toBe(false);
    expect(res.bonusXp).toBe(0);
    const loot = applyChest({ owned: [], dry: 3 }, res);
    expect(loot.owned).toContain(res.item);
    expect(loot.dry).toBe(0);

    const again = rollChest({ claim: res.claim, date: res.date, kind: 'world', luck: { ...luck, dry: 8 }, owned: [] });
    expect(again.item).toBe(res.item);
    const dup = rollChest({ claim: res.claim, date: res.date, kind: 'world', luck: { ...luck, dry: 8 }, owned: CATALOG.map((c) => c.id) });
    if (dup.item) {
      expect(dup.dup).toBe(true);
      expect(dup.bonusXp).toBeGreaterThan(0);
    }
    expect(applyChest(loot, { ...res, item: undefined }).dry).toBe(1);
  });

  it('knows which claims are chests', () => {
    expect(chestKind('chest')).toBe('daily');
    expect(chestKind('week')).toBe('weekly');
    expect(chestKind('path:3')).toBe('world');
    expect(chestKind('q:gym')).toBeNull();
  });
});

describe('level-gated chest pool', () => {
  it('holds more (and rarer) things as your level grows', () => {
    const low = chestPool(1);
    const high = chestPool(30);
    expect(low.length).toBeGreaterThan(0);
    expect(high.length).toBeGreaterThan(low.length);
    expect(low.some((i) => i.rarity === 'legendary')).toBe(false);
    expect(high.some((i) => i.id === 'pet:nova')).toBe(true);
    expect(low.some((i) => i.id === 'pet:nova')).toBe(false);
  });

  it('never drops an item above your level, and odds leave out empty rarities', () => {
    const lv: Luck = { ...luck, level: 1, dry: 8 };
    for (let i = 0; i < 3000; i++) {
      const r = rollChest({ claim: 'path:2', date: `l${i}`, kind: 'world', luck: lv, owned: [] });
      if (r.item) expect((CATALOG.find((c) => c.id === r.item)?.minLevel ?? 0) <= 1).toBe(true);
    }
    const o = chestOdds('world', lv);
    expect(o.rarity.legendary).toBe(0);
    expect(RARITIES.reduce((n, r) => n + o.rarity[r], 0)).toBeCloseTo(o.drop);
    expect(chestOdds('world', { ...lv, level: 40 }).rarity.legendary).toBeGreaterThan(0);
  });
});

describe('rank pets', () => {
  it('are never in a chest', () => {
    const rank = CATALOG.filter((i) => i.source === 'rank');
    expect(rank.length).toBeGreaterThan(0);
    expect(chestPool(999).some((i) => i.source === 'rank')).toBe(false);
  });

  it('join you silently when you reach their tier and stay after', () => {
    expect(rankRewards(0)).toHaveLength(0);
    const iron = reachTier(undefined, 1)!;
    expect(iron.owned).toEqual(rankRewards(1).map((i) => i.id));
    expect(iron.peak).toBe(1);
    const top = reachTier(iron, 8)!;
    expect(top.owned).toEqual(expect.arrayContaining(rankRewards(8).map((i) => i.id)));
    // Nothing new: same object back.
    expect(reachTier(top, 8)).toBe(top);
    expect(reachTier(top, 2)).toBe(top);
    for (const i of rankRewards(8)) expect(hasItem(i.id, false, top.owned)).toBe(true);
  });

  it('is a reducer action that keeps the rest of the collection', () => {
    const s0: AppState = { ...initialState, loot: { owned: ['pet:nova'], dry: 2 } };
    const s1 = reducer(s0, { type: 'reachTier', tier: 3 });
    expect(s1.loot?.owned).toEqual(expect.arrayContaining(['pet:nova', ...rankRewards(3).map((i) => i.id)]));
    expect(s1.loot?.dry).toBe(2);
    expect(reducer(s1, { type: 'reachTier', tier: 3 })).toBe(s1);
  });
});

describe('collection in the store', () => {
  const base: AppState = { ...initialState };

  it('rolls when a chest is claimed and keeps XP as the main reward', () => {
    let s = base;
    for (let i = 0; i < 60; i++) s = reducer(s, { type: 'claimReward', entry: { id: 'chest', date: `2026-01-${String(i).padStart(3, '0')}`, xp: 50 } });
    expect(s.questLog).toHaveLength(60);
    expect(s.questLog!.every((q) => q.xp >= 50)).toBe(true);
    expect(s.loot?.last?.kind).toBe('daily');
    // Quest claims are not chests.
    const q = reducer(base, { type: 'claimReward', entry: { id: 'q:gym', date: '2026-09-28', xp: 80 } });
    expect(q.loot).toBeUndefined();
  });

  it('only lets you use pets and outfits you have', () => {
    expect(hasItem('pet:kettle', false)).toBe(true);
    expect(hasItem('pet:nova', false)).toBe(false);
    expect(hasItem('pet:nova', false, ['pet:nova'])).toBe(true);
    expect(hasItem('pet:flame', true)).toBe(true);
    const s = { ...base, settings: { ...base.settings, pet: 'nova', mascotSkin: 'chrome' } };
    expect(petSpecies(s)).toBe('kettle');
    expect(mascotSkin(s)).toBe('classic');
    const won = { ...s, loot: { owned: ['pet:nova', 'skin:chrome'], dry: 0 } };
    expect(petSpecies(won)).toBe('nova');
    expect(mascotSkin(won)).toBe('chrome');
  });
});
