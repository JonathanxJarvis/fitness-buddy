import React, { useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { T } from './ui';
import { usePulse } from './motion';
import { RankBadge } from './RankBadge';
import { Pet, type Species } from './Mascot';
import { MiniChest } from './pet/MiniChest';
import { EVOLUTION } from './pet/Gear';
import type { PetCareLevels } from './Mascot';
import { STAGES, TIERS, type Stage, type Tier } from '@/lib/progression';

/*
 * The rank path as a game map: every tier is its own world with its own
 * scenery, a winding trail, treasure chests between divisions and a guardian
 * at the gate to the next world.
 */

export const CHEST_XP_PATH = 100;

interface World {
  name: string;
  guardian: string;
  sky: [string, string];
  trail: string;
  ink: string;
  decor: (w: number, h: number, id: string) => React.ReactNode;
  /** x positions (0–1) of the six nodes, bottom to top. */
  xs: number[];
}

const tri = (x: number, y: number, w: number, h: number) => `${x - w / 2},${y} ${x + w / 2},${y} ${x},${y - h}`;

const WORLDS: Record<string, World> = {
  rookie: {
    name: 'Training Grounds',
    guardian: 'Coach Cone',
    sky: ['#BFE8C9', '#7CC98F'],
    trail: '#E9D9A6',
    ink: '#1D4A2B',
    xs: [0.5, 0.3, 0.62, 0.78, 0.45, 0.5],
    decor: (w, h) => (
      <G>
        <Ellipse cx={w * 0.1} cy={h} rx={w * 0.35} ry={70} fill="#5DB373" />
        <Ellipse cx={w * 0.95} cy={h - 10} rx={w * 0.4} ry={90} fill="#4FA566" />
        {[0.12, 0.2, 0.86, 0.92, 0.08].map((x, i) => (
          <G key={i}>
            <Rect x={w * x - 3} y={h * (0.25 + i * 0.13) - 4} width={6} height={12} fill="#6B4A2B" />
            <Polygon points={tri(w * x, h * (0.25 + i * 0.13) - 2, 30, 44)} fill="#2F7D46" />
          </G>
        ))}
        {[0.3, 0.7].map((x, i) => (
          <Circle key={i} cx={w * x} cy={40 + i * 18} r={14} fill="#FFFFFF" opacity={0.6} />
        ))}
      </G>
    ),
  },
  iron: {
    name: 'The Iron Forge',
    guardian: 'Rusty Golem',
    sky: ['#3B4148', '#20252B'],
    trail: '#59636D',
    ink: '#E3E8EC',
    xs: [0.5, 0.72, 0.38, 0.22, 0.6, 0.5],
    decor: (w, h) => (
      <G>
        <Path d={`M0 ${h} L0 ${h * 0.55} L${w * 0.14} ${h * 0.6} L${w * 0.2} ${h * 0.75} L${w * 0.12} ${h}`} fill="#2B3036" />
        <Path d={`M${w} ${h} L${w} ${h * 0.4} L${w * 0.86} ${h * 0.5} L${w * 0.8} ${h * 0.7} L${w * 0.9} ${h}`} fill="#2B3036" />
        {[0.08, 0.9, 0.15, 0.85].map((x, i) => (
          <Path key={i} d={`M${w * x} ${h * (0.2 + i * 0.18)} l8 12 l-6 6 l10 14`} stroke="#FF7A2F" strokeWidth={2.5} fill="none" opacity={0.9} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <Circle key={i} cx={(w * ((i * 37) % 100)) / 100} cy={(h * ((i * 53) % 100)) / 100} r={1.8} fill="#FFB25B" opacity={0.8} />
        ))}
        <Rect x={w * 0.84} y={h * 0.2} width={34} height={10} rx={2} fill="#4A525B" />
        <Rect x={w * 0.84 + 10} y={h * 0.2 + 10} width={14} height={12} fill="#4A525B" />
      </G>
    ),
  },
  bronze: {
    name: 'Copper Canyon',
    guardian: 'Sandstone Brute',
    sky: ['#FFD9A8', '#E89A5B'],
    trail: '#F7E2B8',
    ink: '#5A2C0E',
    xs: [0.5, 0.25, 0.4, 0.75, 0.55, 0.5],
    decor: (w, h) => (
      <G>
        <Circle cx={w * 0.82} cy={50} r={26} fill="#FFF1C9" opacity={0.85} />
        <Polygon points={`0,${h} 0,${h * 0.5} ${w * 0.1},${h * 0.5} ${w * 0.16},${h * 0.62} ${w * 0.16},${h}`} fill="#B85C2E" />
        <Polygon points={`${w},${h} ${w},${h * 0.35} ${w * 0.9},${h * 0.35} ${w * 0.84},${h * 0.48} ${w * 0.84},${h}`} fill="#A24E24" />
        {[0.1, 0.9, 0.08].map((x, i) => (
          <G key={i} transform={`translate(${w * x} ${h * (0.22 + i * 0.1)})`}>
            <Rect x={-4} y={-26} width={8} height={30} rx={4} fill="#3F8A4A" />
            <Rect x={-14} y={-18} width={6} height={12} rx={3} fill="#3F8A4A" />
            <Rect x={8} y={-22} width={6} height={12} rx={3} fill="#3F8A4A" />
          </G>
        ))}
      </G>
    ),
  },
  silver: {
    name: 'Frost Peaks',
    guardian: 'Yeti of Reps',
    sky: ['#E8F1FA', '#A9C2DB'],
    trail: '#FFFFFF',
    ink: '#223A55',
    xs: [0.5, 0.7, 0.78, 0.35, 0.25, 0.5],
    decor: (w, h, id) => (
      <G>
        <Polygon points={tri(w * 0.12, h * 0.95, w * 0.4, h * 0.45)} fill="#7F9BB8" />
        <Polygon points={tri(w * 0.12, h * 0.95 - h * 0.3, w * 0.13, h * 0.15)} fill="#FFFFFF" />
        <Polygon points={tri(w * 0.92, h * 0.7, w * 0.36, h * 0.4)} fill="#6D8AA8" />
        <Polygon points={tri(w * 0.92, h * 0.7 - h * 0.27, w * 0.12, h * 0.13)} fill="#FFFFFF" />
        {Array.from({ length: 18 }, (_, i) => (
          <Circle key={id + i} cx={(w * ((i * 29) % 100)) / 100} cy={(h * ((i * 47) % 100)) / 100} r={2.2} fill="#FFFFFF" opacity={0.9} />
        ))}
      </G>
    ),
  },
  gold: {
    name: 'Golden Temple',
    guardian: 'The Gilded Sphinx',
    sky: ['#FFE9A8', '#E0A82E'],
    trail: '#FFF4D0',
    ink: '#5A3B00',
    xs: [0.5, 0.3, 0.2, 0.55, 0.75, 0.5],
    decor: (w, h) => (
      <G>
        {Array.from({ length: 10 }, (_, i) => (
          <Path key={i} d={`M${w * 0.85} 40 L${w * 0.85 + Math.cos(i * 0.63) * 70} ${40 + Math.sin(i * 0.63) * 70}`} stroke="#FFF6D6" strokeWidth={4} opacity={0.5} />
        ))}
        <Circle cx={w * 0.85} cy={40} r={20} fill="#FFF6D6" />
        {[0.06, 0.16, 0.84, 0.94].map((x, i) => (
          <G key={i}>
            <Rect x={w * x - 7} y={h * 0.55} width={14} height={h * 0.4} fill="#F5D27A" />
            <Rect x={w * x - 10} y={h * 0.55 - 6} width={20} height={6} fill="#C8962A" />
          </G>
        ))}
        <Polygon points={`${w * 0.02},${h * 0.55 - 6} ${w * 0.2},${h * 0.55 - 6} ${w * 0.11},${h * 0.45}`} fill="#C8962A" />
        <Polygon points={`${w * 0.8},${h * 0.55 - 6} ${w * 0.98},${h * 0.55 - 6} ${w * 0.89},${h * 0.45}`} fill="#C8962A" />
      </G>
    ),
  },
  platinum: {
    name: 'Tidal Reef',
    guardian: 'Kraken Kurl',
    sky: ['#7FE3DA', '#138C87'],
    trail: '#D8FFF9',
    ink: '#053B3A',
    xs: [0.5, 0.75, 0.55, 0.25, 0.4, 0.5],
    decor: (w, h) => (
      <G>
        {[0.2, 0.45, 0.7].map((f, i) => (
          <Path key={i} d={`M0 ${h * f} q${w * 0.125} -12 ${w * 0.25} 0 t${w * 0.25} 0 t${w * 0.25} 0 t${w * 0.25} 0`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} fill="none" />
        ))}
        {[0.08, 0.9, 0.14].map((x, i) => (
          <Path key={i} d={`M${w * x} ${h} q-12 -30 0 -60 q12 -30 0 -60`} stroke="#0B6B55" strokeWidth={6} fill="none" strokeLinecap="round" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <Circle key={i} cx={(w * ((i * 41) % 100)) / 100} cy={(h * ((i * 23) % 100)) / 100} r={3 + (i % 3)} fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} />
        ))}
      </G>
    ),
  },
  diamond: {
    name: 'Crystal Caverns',
    guardian: 'Prism Warden',
    sky: ['#1B2E6B', '#0B1433'],
    trail: '#6F8FE0',
    ink: '#D8E6FF',
    xs: [0.5, 0.28, 0.72, 0.8, 0.35, 0.5],
    decor: (w, h, id) => (
      <G>
        <Defs>
          <SvgGradient id={`cr${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#BFE0FF" />
            <Stop offset="1" stopColor="#4C8DF6" />
          </SvgGradient>
        </Defs>
        {[
          [0.08, 0.9, 26, 70],
          [0.16, 0.95, 18, 44],
          [0.9, 0.6, 24, 64],
          [0.95, 0.66, 14, 36],
          [0.1, 0.35, 16, 40],
        ].map(([x, y, cw, ch], i) => (
          <Polygon key={i} points={`${w * x - cw / 2},${h * y} ${w * x},${h * y - ch} ${w * x + cw / 2},${h * y} ${w * x},${h * y + 8}`} fill={`url(#cr${id})`} opacity={0.9} />
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <Path key={i} d={`M${(w * ((i * 31) % 100)) / 100} ${(h * ((i * 59) % 100)) / 100} m-4 0 h8 m-4 -4 v8`} stroke="#DCEBFF" strokeWidth={1.5} opacity={0.8} />
        ))}
      </G>
    ),
  },
  champion: {
    name: 'Storm Summit',
    guardian: 'Thunder Titan',
    sky: ['#4A2A7A', '#1E1036'],
    trail: '#B794F4',
    ink: '#F1E8FF',
    xs: [0.5, 0.7, 0.3, 0.22, 0.62, 0.5],
    decor: (w, h) => (
      <G>
        {[
          [0.15, 0.12],
          [0.8, 0.3],
          [0.2, 0.6],
          [0.85, 0.82],
        ].map(([x, y], i) => (
          <G key={i} opacity={0.85}>
            <Ellipse cx={w * x} cy={h * y} rx={36} ry={14} fill="#6D5A96" />
            <Ellipse cx={w * x + 18} cy={h * y - 8} rx={22} ry={14} fill="#7E6BA8" />
          </G>
        ))}
        {[
          [0.12, 0.16],
          [0.86, 0.34],
          [0.88, 0.86],
        ].map(([x, y], i) => (
          <Path key={i} d={`M${w * x} ${h * y} l-8 22 h9 l-6 20 l18 -28 h-10 l7 -14 z`} fill="#FFE066" />
        ))}
      </G>
    ),
  },
  titan: {
    name: 'Mount Olympus',
    guardian: 'The Final Rep',
    sky: ['#12071F', '#5A1030'],
    trail: '#FFB0C0',
    ink: '#FFE6EC',
    xs: [0.5, 0.5],
    decor: (w, h) => (
      <G>
        {Array.from({ length: 30 }, (_, i) => (
          <Circle key={i} cx={(w * ((i * 37) % 100)) / 100} cy={(h * ((i * 61) % 100)) / 100} r={i % 4 === 0 ? 1.8 : 1} fill="#FFFFFF" opacity={0.85} />
        ))}
        <Circle cx={w * 0.84} cy={h * 0.3} r={22} fill="#F04E6E" />
        <Ellipse cx={w * 0.84} cy={h * 0.3} rx={38} ry={8} fill="none" stroke="#FFD0DA" strokeWidth={3} />
        <Rect x={w * 0.06} y={h * 0.62} width={60} height={8} fill="#FFD0DA" />
        {[0, 1, 2].map((i) => (
          <Rect key={i} x={w * 0.06 + 6 + i * 20} y={h * 0.62 + 8} width={8} height={30} fill="#FFE6EC" />
        ))}
        <Polygon points={`${w * 0.06 - 4},${h * 0.62} ${w * 0.06 + 64},${h * 0.62} ${w * 0.06 + 30},${h * 0.62 - 20}`} fill="#FFD0DA" />
      </G>
    ),
  },
};

const STEP = 78;
const HEADER = 64;

type NodeKind = { type: 'stage'; stage: Stage } | { type: 'chest'; id: string; unlockAt: number } | { type: 'boss'; tier: Tier; next: Stage };

function worldNodes(tier: Tier): NodeKind[] {
  const stages = STAGES.filter((s) => s.tier.key === tier.key);
  if (stages.length === 1) return [{ type: 'stage', stage: stages[0] }];
  const nodes: NodeKind[] = [];
  stages.forEach((s, i) => {
    nodes.push({ type: 'stage', stage: s });
    const after = STAGES[s.index + 1];
    if (i < stages.length - 1 && after) nodes.push({ type: 'chest', id: `path:${after.index}`, unlockAt: after.index });
  });
  const next = STAGES[stages[stages.length - 1].index + 1];
  if (next) nodes.push({ type: 'boss', tier, next });
  return nodes;
}

export function worldHeight(tier: Tier): number {
  return HEADER + worldNodes(tier).length * STEP + 20;
}

/** Scroll offset (from the top of the map) of the current stage. */
export function currentOffset(stageIndex: number): number {
  const tiers = [...TIERS].reverse();
  let y = 0;
  for (const t of tiers) {
    const nodes = worldNodes(t);
    const h = worldHeight(t);
    const i = nodes.findIndex((n) => n.type === 'stage' && n.stage.index === stageIndex);
    if (i >= 0) return y + h - 20 - (i + 0.5) * STEP;
    y += h;
  }
  return 0;
}

function Pulse({ color, size }: { color: string; size: number }) {
  const p = usePulse(1500);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
      }}
    />
  );
}

export function WorldMap({
  width,
  current,
  claimed,
  onChest,
  pet,
  skin,
  aura,
  care,
}: {
  width: number;
  current: number;
  claimed: Set<string>;
  onChest: (id: string) => void;
  pet?: string;
  skin?: string;
  aura?: string;
  care?: PetCareLevels;
}) {
  const tiers = [...TIERS].reverse();
  return (
    <View style={{ borderRadius: 24, overflow: 'hidden' }}>
      {tiers.map((tier, ti) => {
        const world = WORLDS[tier.key];
        const nodes = worldNodes(tier);
        const h = worldHeight(tier);
        const worldNo = TIERS.length - ti;
        const firstStage = STAGES.find((s) => s.tier.key === tier.key)!;
        const reached = current >= firstStage.index;
        const tierIdx = TIERS.length - 1 - ti;
        // Node centers, bottom to top.
        const pts = nodes.map((_, i) => ({ x: (world.xs[i] ?? 0.5) * width, y: h - 20 - (i + 0.5) * STEP }));
        const full = [{ x: width / 2, y: h }, ...pts, { x: width / 2, y: 0 }];
        const d = full
          .map((p, i) => {
            if (i === 0) return `M${p.x} ${p.y}`;
            const q = full[i - 1];
            const my = (p.y + q.y) / 2;
            return `C${q.x} ${my} ${p.x} ${my} ${p.x} ${p.y}`;
          })
          .join(' ');
        return (
          <View key={tier.key} style={{ height: h, width}}>
            <Svg width={width} height={h} style={{ position: 'absolute' }}>
              <Defs>
                <SvgGradient id={`sky${tier.key}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={world.sky[0]} />
                  <Stop offset="1" stopColor={world.sky[1]} />
                </SvgGradient>
              </Defs>
              <Rect x={0} y={0} width={width} height={h} fill={`url(#sky${tier.key})`} />
              {world.decor(width, h, tier.key)}
              <Path d={d} stroke="#000" strokeOpacity={0.18} strokeWidth={22} fill="none" strokeLinecap="round" />
              <Path d={d} stroke={world.trail} strokeWidth={16} fill="none" strokeLinecap="round" />
              <Path d={d} stroke={world.ink} strokeOpacity={0.25} strokeWidth={3} fill="none" strokeDasharray="2 12" strokeLinecap="round" />
              {!reached && <Rect x={0} y={0} width={width} height={h} fill="#000" opacity={0.28} />}
            </Svg>

            {/* World plaque */}
            <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                <T size={10} weight="800" color="rgba(255,255,255,0.75)" style={{ letterSpacing: 1.2 }}>
                  WORLD {worldNo} · {tier.name.toUpperCase()}
                </T>
                <T size={15} weight="800" color="#fff">{world.name}</T>
              </View>
              {!reached && <Ionicons name="lock-closed" size={16} color="#fff" />}
              <View style={{ flex: 1 }} />
              {/* Your pet's form in this world: what it earns when you get here. */}
              <View style={{ alignItems: 'center' }} accessibilityLabel={`${tier.name} form: ${EVOLUTION[tierIdx].gear}`}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1.5, borderColor: reached ? tier.glow : 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <Pet species={(pet ?? 'kettle') as Species} size={50} skin={skin} tier={tierIdx} animate={false} silhouette={reached ? undefined : 'rgba(255,255,255,0.28)'} />
                </View>
                <T size={9} weight="800" color="#fff" style={{ marginTop: 2, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 6, paddingHorizontal: 5, overflow: 'hidden' }}>
                  {EVOLUTION[tierIdx].gear.toUpperCase()}
                </T>
              </View>
            </View>

            {nodes.map((n, i) => {
              const p = pts[i];
              if (n.type === 'stage') {
                const state = n.stage.index < current ? 'done' : n.stage.index === current ? 'current' : 'locked';
                const size = state === 'current' ? 76 : 56;
                return (
                  <View key={i} style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                    {state === 'current' && <Pulse color={tier.glow} size={size + 26} />}
                    <RankBadge stage={n.stage} size={size} locked={state === 'locked'} />
                    {state === 'done' && (
                      <View style={{ position: 'absolute', right: 0, bottom: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22B573', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                    {state === 'current' && (
                      <View style={{ position: 'absolute', top: size / 2 - 30, [p.x < width / 2 ? 'left' : 'right']: size + 2 } as never}>
                        <Pet species={(pet ?? 'kettle') as Species} size={64} mood="pumped" tier={tierIdx} skin={skin} aura={aura} care={care} />
                        <View style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: -4, alignSelf: 'center' }}>
                          <T size={10} weight="800" color="#111">YOU</T>
                        </View>
                      </View>
                    )}
                  </View>
                );
              }
              if (n.type === 'chest') {
                const open = claimed.has(n.id);
                const ready = current >= n.unlockAt && !open;
                return (
                  <React.Fragment key={i}>
                  <Pressable
                    disabled={!ready}
                    onPress={() => onChest(n.id)}
                    accessibilityLabel={open ? 'Chest opened' : ready ? `Open chest, ${CHEST_XP_PATH} XP` : 'Locked chest'}
                    style={{ position: 'absolute', left: p.x - 22, top: p.y - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {ready && <Pulse color="#FFD66B" size={58} />}
                    <View style={{ opacity: open ? 0.7 : 1 }}>
                      <MiniChest size={44} state={open ? 'open' : ready ? 'ready' : 'locked'} />
                    </View>
                    {ready && (
                      <View style={{ position: 'absolute', top: -16, width: 64, alignItems: 'center' }}>
                        <T size={9} weight="800" color="#FFE08F" numberOfLines={1} style={{ backgroundColor: '#5A3B00', borderRadius: 8, paddingHorizontal: 6, overflow: 'hidden' }}>
                          +{CHEST_XP_PATH} XP
                        </T>
                      </View>
                    )}
                  </Pressable>
                  </React.Fragment>
                );
              }
              const beaten = current >= n.next.index;
              return (
                <View key={i} style={{ position: 'absolute', left: p.x - 70, top: p.y - 26, width: 140, alignItems: 'center' }}>
                  {!beaten && EVOLUTION[tierIdx + 1] && (
                    <T size={9} weight="800" color={tier.glow} numberOfLines={1} style={{ position: 'absolute', top: -17, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 5, overflow: 'hidden' }}>
                      PET UNLOCKS {EVOLUTION[tierIdx + 1].gear.toUpperCase()}
                    </T>
                  )}
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: beaten ? '#22B573' : '#1B1B1F', borderWidth: 3, borderColor: tier.glow, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={beaten ? 'shield-checkmark' : 'skull'} size={24} color={beaten ? '#fff' : tier.glow} />
                  </View>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }}>
                    <T size={10} weight="800" color="#fff" numberOfLines={1}>
                      {beaten ? `${world.guardian} beaten` : `Boss: ${world.guardian}`}
                    </T>
                  </View>
                </View>
              );
            })}

          </View>
        );
      })}
    </View>
  );
}
