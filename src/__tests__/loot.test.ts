import { describe, expect, it } from '@jest/globals';
import { applyChest, CATALOG, chestKind, chestOdds, dropChance, hasItem, rarityWeights, rollChest, RARITIES, type Luck } from '@/lib/loot';
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
        expect(CATALOG.find((c) => c.id === r.item)?.source).not.toBe('starter');
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
