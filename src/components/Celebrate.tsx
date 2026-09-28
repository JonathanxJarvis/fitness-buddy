import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { RankBadge } from './RankBadge';
import { T } from './ui';
import { nativeDriver, useTween } from './motion';
import { useStore } from '@/store/StoreProvider';
import { STAGES, stateProgression, TIERS } from '@/lib/progression';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { Pet, PETS, type Species } from './Mascot';
import { EVOLUTION } from './pet/Gear';
import { usePetLook } from './pet/usePetLook';
import { itemById, rankRewards, RARITY, type LootItem } from '@/lib/loot';
import type { AppState } from '@/lib/types';
import { todayKey } from '@/lib/dates';

export type Celebration =
  /** `claim` is the reward id (e.g. "path:4") so the opening can show that chest's drop; `drop` forces an item (demo). */
  | { kind: 'chest'; xp: number; title?: string; color?: string; claim?: string; drop?: string }
  /** `joined`: item ids of pets that joined you at this rank (shown as a quiet note). */
  | { kind: 'rankUp'; from: number; to: number; joined?: string[] };

const Ctx = createContext<(c: Celebration | Celebration[]) => void>(() => {});

/** Queue a full-screen celebration: a chest opening or a rank-up. */
export const useCelebrate = () => useContext(Ctx);

/**
 * Holds the celebration queue, draws the current one over the app and
 * queues a rank-up on its own whenever your rank climbs.
 */
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const { state, ready, dispatch } = useStore();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const celebrate = useCallback((c: Celebration | Celebration[]) => setQueue((q) => [...q, ...(Array.isArray(c) ? c : [c])]), []);

  const stage = useMemo(
    () => (state.profile ? stateProgression(state, todayKey()).stage.index : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.workouts, state.profile, state.exercises, state.questLog],
  );
  const prevStage = useRef<number | null>(null);
  useEffect(() => {
    if (!ready || stage === null) return;
    const p = prevStage.current;
    prevStage.current = stage;
    // Pets that join at a rank tier are simply granted (also for tiers reached before this build).
    const tier = Math.max(0, TIERS.findIndex((t) => t.key === STAGES[stage]?.tier.key));
    const owned = state.loot?.owned ?? [];
    const joined = rankRewards(tier).map((i) => i.id).filter((id) => !owned.includes(id));
    if (joined.length || (state.loot?.peak ?? -1) < tier) dispatch({ type: 'reachTier', tier });
    if (p !== null && stage > p) celebrate({ kind: 'rankUp', from: p, to: stage, joined: joined.length ? joined : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stage, celebrate]);

  const current = queue[0];
  const next = () => setQueue((q) => q.slice(1));

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      <Modal visible={!!current} transparent animationType="fade" onRequestClose={next} statusBarTranslucent>
        {current?.kind === 'chest' && <ChestOpening key={queue.length + 'c'} c={current} onDone={next} />}
        {current?.kind === 'rankUp' && <RankUp key={queue.length + 'r' + current.to} from={current.from} to={current.to} joined={current.joined} onDone={next} />}
      </Modal>
    </Ctx.Provider>
  );
}

// ---------- shared pieces ----------

const run = (a: Animated.CompositeAnimation) => new Promise<void>((r) => a.start(() => r()));
const timing = (v: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic)) =>
  Animated.timing(v, { toValue, duration, easing, useNativeDriver: nativeDriver });

function useSpin(duration = 7000) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
}

/** Light rays that slowly turn behind the prize. */
function Rays({ color, size, opacity }: { color: string; size: number; opacity: Animated.Value | Animated.AnimatedInterpolation<number> }) {
  const rotate = useSpin();
  const gid = 'ray' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const rays = 14;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, opacity, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="-100 -100 200 200">
        <Defs>
          <RadialGradient id={gid} cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {Array.from({ length: rays }, (_, i) => {
          const a = (i / rays) * Math.PI * 2;
          const w = 0.09;
          return (
            <Polygon
              key={i}
              points={`0,0 ${Math.cos(a - w) * 100},${Math.sin(a - w) * 100} ${Math.cos(a + w) * 100},${Math.sin(a + w) * 100}`}
              fill={`url(#${gid})`}
            />
          );
        })}
        <Circle r="34" fill={`url(#${gid})`} opacity={0.4} />
      </Svg>
    </Animated.View>
  );
}

interface Bit {
  dx: number;
  dy: number;
  size: number;
  color: string;
  shape: 'coin' | 'gem' | 'spark' | 'strip';
  spin: number;
}

/** Coins, gems and sparks that burst out from the centre and fall. */
function Burst({ bits, progress }: { bits: Bit[]; progress: Animated.Value }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', left: '50%', top: '50%' }}>
        {bits.map((b, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: -b.size / 2,
              top: -b.size / 2,
              opacity: progress.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] }) },
                // Up fast, then gravity pulls it down.
                { translateY: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, b.dy, b.dy + 260] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.spin}deg`] }) },
              ],
            }}
          >
            <BitShape b={b} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function BitShape({ b }: { b: Bit }) {
  const s = b.size;
  if (b.shape === 'coin')
    return (
      <Svg width={s} height={s} viewBox="0 0 20 20">
        <Circle cx="10" cy="10" r="9.5" fill="#B7860B" />
        <Circle cx="10" cy="10" r="7.5" fill="#FFD34D" />
        <Rect x="8.6" y="5" width="2.8" height="10" rx="1.2" fill="#E5A914" />
      </Svg>
    );
  if (b.shape === 'gem')
    return (
      <Svg width={s} height={s} viewBox="0 0 20 20">
        <Polygon points="10,1 18,8 10,19 2,8" fill={b.color} />
        <Polygon points="10,1 14,8 10,19 6,8" fill="#FFFFFF" opacity={0.35} />
      </Svg>
    );
  if (b.shape === 'strip') return <View style={{ width: s * 0.45, height: s, borderRadius: 2, backgroundColor: b.color }} />;
  return (
    <Svg width={s} height={s} viewBox="0 0 20 20">
      <Polygon points="10,0 12,8 20,10 12,12 10,20 8,12 0,10 8,8" fill={b.color} />
    </Svg>
  );
}

function makeBits(n: number, colors: string[], shapes: Bit['shape'][], spread = 190): Bit[] {
  // Deterministic so the burst looks the same every time.
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.6;
    const d = spread * (0.45 + rnd() * 0.65);
    return {
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d,
      size: 10 + rnd() * 12,
      color: colors[i % colors.length],
      shape: shapes[i % shapes.length],
      spin: (rnd() - 0.5) * 900,
    };
  });
}

function Backdrop({ color, onPress, children, hint }: { color: string; onPress: () => void; children: React.ReactNode; hint: Animated.Value }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Continue" style={{ flex: 1 }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#060D09', opacity: 0.97 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.12 }]} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      <Animated.View style={{ position: 'absolute', bottom: 56, left: 0, right: 0, alignItems: 'center', opacity: hint }}>
        <T size={13} weight="700" color="rgba(255,255,255,0.7)">Tap to continue</T>
      </Animated.View>
    </Pressable>
  );
}

// ---------- chest ----------

function ChestArt({ size, color, open }: { size: number; color: string; open: Animated.Value }) {
  const lid = {
    transform: [
      { translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.55] }) },
      { translateX: open.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.18] }) },
      { rotate: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '28deg'] }) },
    ],
    opacity: open.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
  };
  const glow = open.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });
  const h = size * 0.82;
  return (
    <View style={{ width: size, height: h }}>
      {/* Treasure glow spilling out of the open chest */}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: -size * 0.25, alignItems: 'center', opacity: glow }}>
        <Svg width={size} height={size * 0.7} viewBox="0 0 200 140">
          <Defs>
            <RadialGradient id="loot" cx="50%" cy="60%" r="50%">
              <Stop offset="0" stopColor="#FFF6C8" stopOpacity={1} />
              <Stop offset="0.4" stopColor="#FFD34D" stopOpacity={0.7} />
              <Stop offset="1" stopColor="#FFD34D" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="100" cy="72" rx="98" ry="66" fill="url(#loot)" />
        </Svg>
      </Animated.View>
      {/* Body */}
      <Svg width={size} height={h} viewBox="0 0 200 164" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8A4B22" />
            <Stop offset="1" stopColor="#5A2E12" />
          </LinearGradient>
          <LinearGradient id="band" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE38A" />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>
        {/* heap of coins peeking out */}
        <Ellipse cx="100" cy="74" rx="70" ry="14" fill="#E5A914" />
        <Circle cx="72" cy="70" r="9" fill="#FFD34D" />
        <Circle cx="96" cy="66" r="10" fill="#FFE380" />
        <Circle cx="122" cy="70" r="9" fill="#FFD34D" />
        <Polygon points="108,58 116,66 108,78 100,66" fill="#5FD4FF" />
        <Rect x="20" y="72" width="160" height="86" rx="12" fill="url(#wood)" />
        <Rect x="20" y="72" width="160" height="12" fill="#000" opacity={0.22} />
        <Rect x="20" y="108" width="160" height="10" fill="url(#band)" />
        <Rect x="36" y="72" width="16" height="86" fill="url(#band)" />
        <Rect x="148" y="72" width="16" height="86" fill="url(#band)" />
        <Rect x="86" y="96" width="28" height="34" rx="6" fill="url(#band)" stroke="#7A4A08" strokeWidth={2} />
        <Circle cx="100" cy="110" r="4" fill="#5A2E12" />
        <Rect x="98" y="110" width="4" height="10" fill="#5A2E12" />
      </Svg>
      {/* Lid */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: h }, lid]}>
        <Svg width={size} height={h} viewBox="0 0 200 164">
          <Path d="M20 76 V52 Q20 12 100 12 Q180 12 180 52 V76 Z" fill="url(#wood)" />
          <Path d="M20 76 V52 Q20 12 100 12 Q180 12 180 52 V76 Z" fill="none" stroke="#3E1E0A" strokeWidth={2} />
          <Path d="M36 76 V44 Q38 22 52 18 V76 Z" fill="url(#band)" />
          <Path d="M164 76 V44 Q162 22 148 18 V76 Z" fill="url(#band)" />
          <Rect x="20" y="66" width="160" height="10" fill="url(#band)" />
          <Rect x="86" y="62" width="28" height="18" rx="4" fill="url(#band)" stroke="#7A4A08" strokeWidth={2} />
          <Path d="M40 30 Q70 18 100 18" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** How long to hold before the bonus drop, skippable with a tap. */
function useSkippableDelay() {
  const skip = useRef<(() => void) | null>(null);
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        skip.current = null;
        resolve();
      }, ms);
      skip.current = () => {
        clearTimeout(t);
        skip.current = null;
        resolve();
      };
    });
  return { wait, skip };
}

interface Drop {
  item: LootItem;
  dup: boolean;
  bonusXp: number;
}

function ChestOpening({ c, onDone }: { c: Extract<Celebration, { kind: 'chest' }>; onDone: () => void }) {
  const { state } = useStore();
  const color = c.color ?? '#E5A914';
  const mountedAt = useRef(Date.now()).current;
  const loot = useRef(state.loot);
  loot.current = state.loot;
  const enter = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const tell = useRef(new Animated.Value(0)).current;
  const open = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const burst2 = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const [xp, setXp] = useState(0);
  const [drop, setDrop] = useState<Drop | null>(null);
  const shown = useTween(xp, 1100);
  const bits = useMemo(() => makeBits(26, ['#5FD4FF', '#FF6FA8', '#9B5CF6', '#FFE380'], ['coin', 'coin', 'gem', 'spark']), []);
  const rar = drop ? RARITY[drop.item.rarity] : null;
  const dropBits = useMemo(() => (rar ? makeBits(30, [rar.color, rar.glow, '#FFFFFF'], ['spark', 'gem', 'strip'], 210) : []), [rar]);
  const done = useRef(false);
  const canFinish = useRef(false);
  const { wait, skip } = useSkippableDelay();
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  // The chest this celebration is for: matched by claim id, or the one just claimed.
  const findDrop = (): Drop | null => {
    if (c.drop) {
      const item = itemById(c.drop);
      return item ? { item, dup: false, bonusXp: 0 } : null;
    }
    const last = loot.current?.last;
    if (!last?.item) return null;
    const match = c.claim ? last.claim === c.claim : last.at >= mountedAt - 8000;
    const item = match ? itemById(last.item) : undefined;
    return item ? { item, dup: !!last.dup, bonusXp: last.bonusXp } : null;
  };

  useEffect(() => {
    let alive = true;
    let auto: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      await run(Animated.spring(enter, { toValue: 1, friction: 5, tension: 70, useNativeDriver: nativeDriver }));
      const d = findDrop();
      const r = d?.item.rarity;
      // Wobble, harder each time. Rarer finds shake longer and leak their color.
      const steps = [-1, 1, -1.4, 1.4, -1.8, 1.8, ...(r === 'epic' || r === 'legendary' ? [-2.2, 2.2] : []), ...(r === 'legendary' ? [-2.6, 2.6] : []), 0];
      if (d) timing(tell, 1, steps.length * 90, Easing.in(Easing.quad)).start();
      for (const s of steps) {
        if (!alive) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        await run(timing(shake, s, 90, Easing.inOut(Easing.quad)));
      }
      if (!alive) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setXp(c.xp);
      canFinish.current = true;
      Animated.parallel([timing(open, 1, 650, Easing.out(Easing.back(1.4))), timing(burst, 1, 1500, Easing.out(Easing.quad)), timing(text, 1, 500)]).start();
      if (d) {
        await wait(1500);
        if (!alive) return;
        setDrop(d);
        Haptics.impactAsync(d.item.rarity === 'legendary' || d.item.rarity === 'epic' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        await run(timing(lift, 1, 420, Easing.inOut(Easing.cubic)));
        if (!alive) return;
        Animated.parallel([
          Animated.spring(card, { toValue: 1, friction: 6, tension: 60, useNativeDriver: nativeDriver }),
          timing(burst2, 1, 1600, Easing.out(Easing.quad)),
        ]).start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await run(Animated.sequence([Animated.delay(900), timing(hint, 1, 400)]));
        auto = setTimeout(() => alive && finish(), 4200);
      } else {
        await run(Animated.sequence([Animated.delay(900), timing(hint, 1, 400)]));
        auto = setTimeout(() => alive && finish(), 2600);
      }
    })();
    return () => {
      alive = false;
      if (auto) clearTimeout(auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.xp, enter, shake, open, burst, text, hint, finish]);

  const onPress = () => {
    if (skip.current) skip.current();
    else if (canFinish.current) finish();
  };

  const tellColor = drop ? RARITY[drop.item.rarity].color : '#FFFFFF';
  return (
    <Backdrop color={drop ? tellColor : color} onPress={onPress} hint={hint}>
      <Rays color={color} size={420} opacity={Animated.multiply(open, lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }))} />
      {rar && <Rays color={rar.color} size={rar === RARITY.legendary ? 520 : 440} opacity={card.interpolate({ inputRange: [0, 1], outputRange: [0, rar === RARITY.common ? 0.35 : 0.8], extrapolate: 'clamp' })} />}
      <Burst bits={bits} progress={burst} />
      {rar && rar !== RARITY.common && <Burst bits={dropBits} progress={burst2} />}
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }),
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -230] }) },
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
          ],
        }}
      >
        <Animated.View
          style={{
            alignItems: 'center',
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-200, 0] }) },
              { rotate: shake.interpolate({ inputRange: [-3, 3], outputRange: ['-13deg', '13deg'] }) },
            ],
          }}
        >
          {/* A drop leaks its rarity color while the chest shakes. */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -30, opacity: tell, transform: [{ scale: tell.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.25] }) }] }}>
            <Svg width={260} height={220} viewBox="0 0 260 220">
              <Defs>
                <RadialGradient id="tell" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={tellColorFor(c, loot.current, mountedAt)} stopOpacity={0.85} />
                  <Stop offset="1" stopColor={tellColorFor(c, loot.current, mountedAt)} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={130} cy={110} rx={130} ry={110} fill="url(#tell)" />
            </Svg>
          </Animated.View>
          <ChestArt size={190} color={color} open={open} />
        </Animated.View>
        <Animated.View style={{ alignItems: 'center', marginTop: 26, opacity: text, transform: [{ scale: text.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <T size={13} weight="800" color="rgba(255,255,255,0.75)" style={{ letterSpacing: 2 }}>{(c.title ?? 'Chest opened').toUpperCase()}</T>
          <T size={48} weight="800" color="#FFE380" style={{ marginTop: 2 }}>+{Math.round(shown)} XP</T>
        </Animated.View>
      </Animated.View>
      {drop && <DropCard drop={drop} v={card} />}
    </Backdrop>
  );
}

/** The rarity color a pending drop leaks (read once, before the reveal). */
function tellColorFor(c: Extract<Celebration, { kind: 'chest' }>, loot: AppState['loot'], mountedAt: number): string {
  const id = c.drop ?? (loot?.last?.item && (c.claim ? loot.last.claim === c.claim : loot.last.at >= mountedAt - 8000) ? loot.last.item : undefined);
  const item = id ? itemById(id) : undefined;
  return item ? RARITY[item.rarity].glow : '#000000';
}

const KIND_LABEL: Record<string, string> = { pet: 'New pet', skin: 'New outfit', aura: 'New aura' };

/** The collectible, dealt face-up like a trading card, with a sheen for rare pulls. */
function DropCard({ drop, v }: { drop: Drop; v: Animated.Value }) {
  const look = usePetLook();
  const rar = RARITY[drop.item.rarity];
  const sheen = useRef(new Animated.Value(0)).current;
  const fancy = drop.item.rarity === 'epic' || drop.item.rarity === 'legendary';
  useEffect(() => {
    if (!fancy) return;
    const a = Animated.sequence([Animated.delay(500), Animated.timing(sheen, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver })]);
    a.start();
    return () => a.stop();
  }, [fancy, sheen]);
  const petDef = drop.item.kind === 'pet' ? PETS.find((p) => p.key === drop.item.key) : undefined;
  const preview =
    drop.item.kind === 'pet' ? (
      <Pet species={drop.item.key as Species} size={150} mood="proud" />
    ) : drop.item.kind === 'skin' ? (
      <Pet species={look.species} size={150} mood="proud" skin={drop.item.key} tier={look.tier} />
    ) : (
      <Pet species={look.species} size={150} mood="wink" skin={look.skin} tier={look.tier} aura={drop.item.key} />
    );
  const W = 236;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        alignItems: 'center',
        opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [160, 40] }) },
          { scaleX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.05, 0.9, 1] }) },
          { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
        ],
      }}
    >
      <View style={{ width: W, borderRadius: 24, backgroundColor: '#0D1310', borderWidth: 1.5, borderColor: rar.color, overflow: 'hidden', alignItems: 'center', paddingBottom: 16 }}>
        <ExpoGradient colors={[rar.color + '66', rar.color + '00']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 220 }} />
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12 }}>
          <T size={10} weight="800" color="rgba(255,255,255,0.6)" style={{ letterSpacing: 1.6 }}>BONUS FIND</T>
          <T size={10} weight="800" color="rgba(255,255,255,0.45)" style={{ letterSpacing: 1 }}>
            {KIND_LABEL[drop.item.kind].replace('New ', '').toUpperCase()}
          </T>
        </View>
        <T size={13} weight="800" color={rar.glow} style={{ letterSpacing: 5, marginTop: 8 }}>{rar.label.toUpperCase()}</T>
        <View style={{ marginTop: 2 }}>{preview}</View>
        <T size={26} weight="800" color="#fff" style={{ marginTop: 2 }}>{drop.item.name}</T>
        <T size={13} color="rgba(255,255,255,0.7)" center style={{ marginTop: 2, paddingHorizontal: 16 }}>
          {drop.dup ? `Already in your collection · +${drop.bonusXp} bonus XP` : petDef ? `${KIND_LABEL.pet} · ${petDef.kind}` : KIND_LABEL[drop.item.kind]}
        </T>
        {fancy && (
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', top: -40, bottom: -40, width: 70, transform: [{ translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-W, W] }) }, { rotate: '18deg' }] }}
          >
            <ExpoGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
        )}
      </View>
      <T size={12} weight="700" color="rgba(255,255,255,0.55)" style={{ marginTop: 10 }}>{drop.dup ? 'Repeats turn into XP' : 'Equip it in Pets › Collection'}</T>
    </Animated.View>
  );
}

// ---------- rank up ----------

/** Your pet cheering beside the new badge; on a new tier it evolves with a flash and shows its new gear. */
function PetEvolve({ fromTier, toTier }: { fromTier: number; toTier: number }) {
  const look = usePetLook();
  const evolves = toTier > fromTier;
  const [tier, setTier] = useState(evolves ? fromTier : toTier);
  const pop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const label = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    (async () => {
      await run(Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: nativeDriver }));
      if (!evolves || !alive) {
        timing(label, 1, 300).start();
        return;
      }
      await run(Animated.delay(500));
      await run(timing(flash, 1, 220, Easing.in(Easing.quad)));
      if (!alive) return;
      setTier(toTier);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Animated.parallel([timing(flash, 0, 520), timing(label, 1, 400)]).start();
      pop.setValue(0.75);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: nativeDriver }).start();
    })();
    return () => {
      alive = false;
    };
  }, [evolves, toTier, pop, flash, label]);
  const glow = TIERS[toTier]?.glow ?? '#fff';
  return (
    <View style={{ alignItems: 'center', marginTop: 12 }}>
      <Animated.View style={{ transform: [{ scale: pop }], opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }) }}>
        <Pet species={look.species} size={118} mood="proud" skin={look.skin} tier={tier} aura={look.aura} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 14, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', opacity: flash, transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) }] }} />
      </Animated.View>
      <Animated.View style={{ opacity: label, alignItems: 'center' }}>
        <T size={13} weight="800" color={glow} style={{ letterSpacing: 1.4 }}>
          {evolves ? `${look.name.toUpperCase()} EVOLVED` : `${look.name.toUpperCase()} IS HYPED`}
        </T>
        {evolves && <T size={12} color="rgba(255,255,255,0.75)">{EVOLUTION[toTier]?.gear} unlocked</T>}
      </Animated.View>
    </View>
  );
}

function RankUp({ from, to, joined, onDone }: { from: number; to: number; joined?: string[]; onDone: () => void }) {
  const a = STAGES[from] ?? STAGES[0];
  const b = STAGES[to] ?? STAGES[0];
  const newTier = a.tier.key !== b.tier.key;
  const [swapped, setSwapped] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const charge = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const bits = useMemo(() => makeBits(34, [b.tier.color, b.tier.glow, '#FFFFFF', '#FFE380'], ['strip', 'spark', 'strip', 'gem'], 230), [b.tier.color, b.tier.glow]);
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    let alive = true;
    let auto: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      await run(timing(enter, 1, 380));
      // The old badge charges up and trembles…
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await run(timing(charge, 1, 1100, Easing.in(Easing.quad)));
      if (!alive) return;
      // …flashes white, and the new one bursts out.
      await run(timing(flash, 1, 140, Easing.linear));
      setSwapped(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.parallel([
        timing(flash, 0, 500),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: nativeDriver }),
        timing(burst, 1, 1800, Easing.out(Easing.quad)),
        Animated.sequence([Animated.delay(200), timing(text, 1, 500)]),
        Animated.sequence([Animated.delay(1200), timing(hint, 1, 400)]),
      ]).start();
      auto = setTimeout(() => alive && finish(), 3900);
    })();
    return () => {
      alive = false;
      if (auto) clearTimeout(auto);
    };
  }, [enter, charge, flash, pop, burst, text, hint, finish]);

  const tremble = charge.interpolate({ inputRange: [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], outputRange: [0, 0, -2, 2, -3, 3, -4, 4, -5, 0] });
  const stage = swapped ? b : a;

  return (
    <Backdrop color={stage.tier.color} onPress={finish} hint={hint}>
      <Rays color={b.tier.glow} size={460} opacity={pop} />
      {/* charge ring */}
      {!swapped && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: 110,
            borderWidth: 3,
            borderColor: b.tier.glow,
            opacity: charge.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.8, 1] }),
            transform: [{ scale: charge.interpolate({ inputRange: [0, 1], outputRange: [1.6, 0.8] }) }],
          }}
        />
      )}
      <Burst bits={bits} progress={burst} />
      <Animated.View style={{ alignItems: 'center', opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }], marginBottom: 14 }}>
        <T size={15} weight="800" color={b.tier.glow} style={{ letterSpacing: 4 }}>{newTier ? 'NEW TIER' : 'RANK UP'}</T>
      </Animated.View>
      <Animated.View
        style={{
          opacity: enter,
          transform: swapped
            ? [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]
            : [
                { scale: charge.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                { translateX: tremble },
              ],
        }}
      >
        <RankBadge key={stage.index} stage={stage} size={swapped ? 150 : 190} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', marginTop: 10, opacity: swapped ? text : enter }}>
        <T size={34} weight="800" color="#fff">{stage.label}</T>
        {swapped ? (
          <>
            <T size={14} color="rgba(255,255,255,0.8)" center style={{ marginTop: 2, maxWidth: 280 }}>{b.tier.motto}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <T size={13} weight="700" color="rgba(255,255,255,0.65)">{a.label}</T>
              <T size={13} weight="800" color="#fff">→</T>
              <T size={13} weight="800" color={b.tier.glow}>{b.label}</T>
            </View>
            {newTier && (
              <T size={12} weight="700" color="rgba(255,255,255,0.7)" style={{ marginTop: 8 }}>New {b.tier.name} frame unlocked for your avatar</T>
            )}
            <PetEvolve fromTier={TIERS.findIndex((t) => t.key === a.tier.key)} toTier={TIERS.findIndex((t) => t.key === b.tier.key)} />
            {joined?.length ? <Joined ids={joined} /> : null}
          </>
        ) : (
          <T size={13} color="rgba(255,255,255,0.6)" style={{ marginTop: 2 }}>Charging…</T>
        )}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: flash }]} />
    </Backdrop>
  );
}

/** A quiet line under the rank-up: a pet that tagged along. */
function Joined({ ids }: { ids: string[] }) {
  const items = ids.map(itemById).filter((i): i is LootItem => !!i && i.kind === 'pet');
  if (!items.length) return null;
  const names = items.map((i) => i.name).join(' and ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingLeft: 4, paddingRight: 12, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      {items.slice(0, 2).map((i) => (
        <Pet key={i.id} species={i.key as Species} size={30} animate={false} mood="wink" />
      ))}
      <T size={12} weight="700" color="rgba(255,255,255,0.75)">{names} joined your pets</T>
    </View>
  );
}

/** A chest and two rank-ups from where you are now, without changing your data. */
export function demoCelebrations(stageIndex: number): Celebration[] {
  // Start at division II so the second rank-up breaks into a new tier.
  const cur = STAGES[stageIndex] ?? STAGES[0];
  const tierStart = STAGES.findIndex((s) => s.tier.key === cur.tier.key);
  const from = Math.min(tierStart + 1, STAGES.length - 3);
  return [
    { kind: 'chest', xp: 100, title: 'World chest', drop: 'pet:nova' },
    { kind: 'rankUp', from, to: from + 1 },
    { kind: 'rankUp', from: from + 1, to: from + 2, joined: demoJoined(from + 2) },
  ];
}

/** For the demo: a rank pet, if one joins at that stage's tier, else a sample one. */
function demoJoined(stageIndex: number): string[] {
  const tier = TIERS.findIndex((t) => t.key === STAGES[stageIndex]?.tier.key);
  const at = rankRewards(tier).filter((i) => i.unlockTier === tier);
  return (at.length ? at : rankRewards(8).slice(0, 1)).map((i) => i.id);
}

/** Preview-only card that plays the chest and rank-up animations on demand. */
export function CelebrationDemoCard() {
  const { state } = useStore();
  const celebrate = useCelebrate();
  const stage = state.profile ? stateProgression(state, todayKey()).stage.index : 0;
  return (
    <Pressable
      onPress={() => celebrate(demoCelebrations(stage))}
      accessibilityRole="button"
      accessibilityLabel="Play demo: open a chest and rank up twice"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: '#12241A', marginBottom: 12 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#E5A914', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={26} height={26} viewBox="0 0 20 20">
          <Polygon points="6,3 17,10 6,17" fill="#3A2A00" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <T weight="800" color="#fff">Watch a chest and two rank-ups</T>
        <T size={12} color="rgba(255,255,255,0.7)">Preview demo. Your data doesn’t change.</T>
      </View>
    </Pressable>
  );
}
