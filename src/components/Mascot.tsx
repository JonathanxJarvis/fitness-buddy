import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { nativeDriver } from './motion';
import { DEF, LIVELY, type Face, type Paint } from './pet/bodies';
import { Arms, armGeometry, FaceView, poseFor, type Mood } from './pet/Face';
import { AURA_GLOW, auraArt, statusProps, tierGear } from './pet/Gear';
import { grey, lum, mix } from './pet/color';
import { PETS, SKINS, type Species } from '@/lib/loot';
import { TIERS } from '@/lib/progression';

export { PETS, SKINS };
export type { Species, Mood };

const INK = '#141A1F';
/** Shared viewBox: the 100 x 100 pet plus headroom for crowns and room for props. */
const VB = { x: -6, y: -9, w: 112 };

/** How you're looking after yourself today (from petCare). */
export interface PetCareLevels {
  fed: number;
  fit: number;
  hydrated: number;
}

export type PetProps = {
  species?: Species;
  size?: number;
  mood?: Mood;
  /** Sweatband color. Defaults to the rank tier's color when `tier` is set. */
  band?: string;
  animate?: boolean;
  skin?: string;
  /** Rank tier index (0 Rookie … 8 Titan): adds the gear earned so far. Leave out for no gear. */
  tier?: number;
  /** Equipped aura key (see AURAS). */
  aura?: string;
  /** Today's care levels: the pet shows sweat, a glow or a water bottle. */
  care?: PetCareLevels;
  /** Draw a flat shape in this color (for locked collection slots). */
  silhouette?: string;
};

function useUid() {
  const id = useId();
  return 'p' + id.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * A pet buddy who cheers you on. Species share one face and arm rig, so moods,
 * rank gear, auras and daily-care props fit every body. Drawn in SVG to stay
 * crisp at any size; idles with breathing, blinking and glancing around.
 */
export function Pet({ species = 'kettle', size = 72, mood = 'happy', band, animate = true, skin = 'classic', tier, aura = 'none', care, silhouette }: PetProps) {
  const u = useUid();
  const def = DEF[species] ?? DEF.kettle;
  const sil = !!silhouette;
  const sleepy = mood === 'sleepy';
  const skinDef = skin !== 'classic' ? SKINS[skin] : undefined;
  const basePal = skinDef ? { main: mix(skinDef.body, skinDef.shade, 0.55), shade: skinDef.shade, dark: skinDef.dark } : def.pal;
  // A neglected pet looks a little washed out.
  const tone = (c: string) => (sleepy ? grey(c, 0.3) : c);
  const pal = { main: tone(basePal.main), shade: tone(basePal.shade), dark: tone(basePal.dark) };
  const k = sil ? () => silhouette! : tone;
  const line = sil ? silhouette! : mix(pal.dark, '#000000', 0.4);
  const p: Paint = sil
    ? { main: silhouette!, shade: silhouette!, dark: silhouette!, line, fill: silhouette!, k, sil }
    : { ...pal, line, fill: `url(#${u}body)`, k, sil };

  let face: Face = def.face;
  if (skinDef && def.faceOnMain) {
    const L = lum(pal.main);
    face = { ink: L > 0.3 ? INK : '#F2F4F6', line: L > 0.45 ? INK : '#FFFFFF', ring: L > 0.55 ? INK : undefined, lid: pal.main, dy: def.face.dy };
  }

  const t = tier === undefined ? -1 : Math.max(0, Math.min(TIERS.length - 1, tier));
  const tierDef = t >= 0 ? TIERS[t] : undefined;
  const bandColor = band ?? tierDef?.color ?? '#22B573';

  // ---- idle animation ----
  const breathe = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState(0);
  const [phase, setPhase] = useState(0);

  const pumped = mood === 'pumped' || mood === 'proud';
  useEffect(() => {
    if (!animate || sil) return;
    const d = sleepy ? 2200 : pumped ? 700 : 1300;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(breathe, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t1 = setTimeout(() => {
        if (Math.random() < 0.35) setLook([-1.3, 0, 1.3][Math.floor(Math.random() * 3)]);
        else {
          setBlink(true);
          t2 = setTimeout(() => setBlink(false), 130);
        }
        schedule();
      }, 1800 + Math.random() * 2400);
    };
    schedule();
    return () => {
      loop.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [animate, sil, sleepy, pumped, breathe]);

  const tick = LIVELY[species];
  useEffect(() => {
    if (!animate || sil || !tick) return;
    const id = setInterval(() => setPhase((f) => (f + 1) % 60), tick);
    return () => clearInterval(id);
  }, [animate, sil, tick]);

  // ---- layers ----
  const pose = poseFor(mood);
  const hands = armGeometry(pose, def.l, def.r).hands;
  const { back, main } = def.draw({ p, band: bandColor, phase });
  const gear = !sil && tierDef ? tierGear({ t, color: tierDef.color, glow: tierDef.glow, def, hands, u }) : { back: [], front: [] };
  const status =
    !sil && care
      ? statusProps({ trained: care.fit >= 1, fed: care.fed >= 1, hydrated: care.hydrated >= 0.75, sleepy, flex: pose === 'flex', hands, def, u, bottleSpecies: species === 'bottle' })
      : sleepy && !sil
        ? statusProps({ trained: false, fed: false, hydrated: false, sleepy, flex: false, hands, def, u, bottleSpecies: false })
        : { back: [], front: [] };
  const auraKey = sil ? 'none' : aura;
  const au = auraArt(auraKey, def, u);
  const floatLive = animate && !!au.float;
  const s = size / VB.w;
  const armColor = sil ? silhouette! : tone(def.arm ?? pal.dark);

  const svgLayer = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.w}`} style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );

  const body = (
    <Svg width={size} height={size} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.w}`}>
      <Defs>
        <LinearGradient id={`${u}body`} x1="0.15" y1="0" x2="0.85" y2="1">
          {(skinDef?.sheen
            ? ([
                [0, mix(pal.main, '#FFFFFF', 0.45)],
                [0.38, pal.main],
                [0.5, mix(pal.shade, '#FFFFFF', 0.25)],
                [0.62, pal.main],
                [1, mix(pal.main, pal.dark, 0.75)],
              ] as const)
            : ([
                [0, mix(pal.main, pal.shade, 0.6)],
                [0.55, pal.main],
                [1, mix(pal.main, pal.dark, 0.6)],
              ] as const)
          ).map(([o, c]) => (
            <Stop key={o} offset={o} stopColor={c} />
          ))}
        </LinearGradient>
        {tierDef && (
          <RadialGradient id={`${u}rad`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.35" stopColor={tierDef.glow} stopOpacity={0.55} />
            <Stop offset="1" stopColor={tierDef.glow} stopOpacity={0} />
          </RadialGradient>
        )}
        <RadialGradient id={`${u}fed`} cx="50%" cy="50%" r="50%">
          <Stop offset="0.4" stopColor="#FFE08A" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#FFE08A" stopOpacity={0} />
        </RadialGradient>
        {AURA_GLOW[auraKey] && (
          <RadialGradient id={`${u}aura`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.3" stopColor={AURA_GLOW[auraKey]} stopOpacity={0.6} />
            <Stop offset="1" stopColor={AURA_GLOW[auraKey]} stopOpacity={0} />
          </RadialGradient>
        )}
      </Defs>
      {au.back}
      {status.back}
      {gear.back}
      {t < 2 && <Ellipse cx={50} cy={96} rx={26} ry={3.8} fill={sil ? silhouette : '#000000'} opacity={sil ? 0.5 : 0.14} />}
      {back}
      <Arms pose={pose} l={def.l} r={def.r} color={armColor} line={line} />
      {main}
      {!sil && <FaceView mood={mood} blink={blink} look={look} face={face} />}
      {gear.front}
      {status.front}
      {au.front}
      {!floatLive && au.float}
    </Svg>
  );

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -size * (pumped ? 0.04 : 0.02)] }) },
            { scaleY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
            { scaleX: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.99] }) },
          ],
        }}
      >
        {body}
      </Animated.View>
      {floatLive && (
        <>
          <Drift size={size} delay={0}>{svgLayer(au.float)}</Drift>
          <Drift size={size} delay={1600}>{svgLayer(au.float)}</Drift>
        </>
      )}
      {animate && auraKey === 'orbit' && <OrbitDot scale={s} />}
    </View>
  );
}

/** Particles that rise and fade, looping. Two staggered copies make a steady stream. */
function Drift({ size, delay, children }: { size: number; delay: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: nativeDriver }));
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: v.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [size * 0.06, -size * 0.14] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A small moon circling the pet on a tilted orbit. */
function OrbitDot({ scale }: { scale: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  const N = 16;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 46, y: 86 + Math.sin(a) * 10, front: Math.sin(a) > 0 };
  });
  const input = pts.map((_, i) => i / N);
  const d = 7 * scale;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -d / 2,
        top: -d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: '#DDE6FF',
        borderWidth: 1,
        borderColor: '#7C93E8',
        opacity: v.interpolate({ inputRange: input, outputRange: pts.map((p) => (p.front ? 1 : 0.35)) }),
        transform: [
          { translateX: v.interpolate({ inputRange: input, outputRange: pts.map((p) => (p.x - VB.x) * scale) }) },
          { translateY: v.interpolate({ inputRange: input, outputRange: pts.map((p) => (p.y - VB.y) * scale) }) },
        ],
      }}
    />
  );
}

/** Kettle, the original buddy. Pass `species` to render another pet in its place. */
export function Kettle({ species = 'kettle', ...props }: PetProps) {
  return <Pet species={species} {...props} />;
}

/** A springy pop-in (kept for older callers). */
export function usePop(visible: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: visible ? 1 : 0, useNativeDriver: nativeDriver, speed: 14, bounciness: visible ? 12 : 0 }).start();
  }, [visible, v]);
  return v;
}

