import { useMemo } from 'react';
import { useStore } from '@/store/StoreProvider';
import { stateProgression, TIERS } from '@/lib/progression';
import { petCare, type PetCare } from '@/lib/quests';
import { mascotSkin, petAura, petName, petSpecies } from '@/lib/pro';
import { PETS, type Species } from '@/lib/loot';
import { todayKey } from '@/lib/dates';
import type { AppState } from '@/lib/types';

export interface PetLook {
  species: Species;
  skin: string;
  aura: string;
  /** Rank tier index (0 Rookie … 8 Titan). */
  tier: number;
  name: string;
  care: PetCare;
}

/** Everything needed to draw your pet the same way on every screen. */
export function petLook(state: AppState, date: string): PetLook {
  const species = petSpecies(state) as Species;
  const def = PETS.find((p) => p.key === species) ?? PETS[0];
  let tier = 0;
  if (state.profile) {
    const key = stateProgression(state, date).stage.tier.key;
    tier = Math.max(0, TIERS.findIndex((t) => t.key === key));
  }
  return { species, skin: mascotSkin(state), aura: petAura(state), tier, name: petName(state, def.name), care: petCare(state, date) };
}

export function usePetLook(date = todayKey()): PetLook {
  const { state } = useStore();
  return useMemo(() => petLook(state, date), [state, date]);
}
