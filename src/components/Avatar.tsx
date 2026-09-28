import React from 'react';
import { Kettle, type Mood, type Species } from './Mascot';
import { RankFrame } from './RankFrame';
import { STAGES } from '@/lib/progression';

/** A person's pet inside their rank frame: how everyone appears in the crew and chats. */
export function Avatar({ stage, pet, skin, size = 48, mood = 'happy', animate = false }: { stage: number; pet?: string; skin?: string; size?: number; mood?: Mood; animate?: boolean }) {
  const s = STAGES[stage] ?? STAGES[0];
  return (
    <RankFrame stage={s} size={size}>
      <Kettle species={(pet ?? 'kettle') as Species} size={size * 0.58} mood={mood} skin={skin} band={s.tier.color} animate={animate} />
    </RankFrame>
  );
}
