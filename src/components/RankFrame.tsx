import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { FONTS } from '@/theme';
import type { Stage } from '@/lib/progression';
import { nativeDriver } from './motion';
import { mix } from './pet/color';

/** Diameter of the round slot inside the frame, as a share of `size`. */
export const RANK_FRAME_SLOT = 0.5;

/**
 * How a tier's metal is finished:
 * matte (rookie, iron): soft, low-contrast, no mirror shine;
 * metal (bronze, silver, gold): polished bands and a specular highlight;
 * crystal (platinum, diamond): iridescent overlay and twinkling glints;
 * glow (champion, titan): polished plus a breathing halo of light.
 */
type Finish = 'matte' | 'metal' | 'crystal' | 'glow';

type Look = {
  /** Ring metal: highlight, mid, shadow (a 4th stop adds a second hue). */
  ring: string[];
  /** Ornament metal (wings, laurel, crown, ribbon): highlight, mid, shadow. */
  trim: string[];
  gem?: string;
  finish: Finish;
};

const LOOKS: Record<string, Look> = {
  rookie: { ring: ['#A88464', '#6A4B36', '#3A291D'], trim: ['#A88464', '#6A4B36', '#3A291D'], finish: 'matte' },
  iron: { ring: ['#B9C0C6', '#6C757D', '#343A40'], trim: ['#C3CAD0', '#646D75', '#2E3439'], finish: 'matte' },
  bronze: { ring: ['#FFD6AC', '#C27A42', '#6A3A18'], trim: ['#FFD0A1', '#C27A42', '#6A3A18'], finish: 'metal' },
  silver: { ring: ['#FFFFFF', '#B8C3CE', '#5F6B78'], trim: ['#FFFFFF', '#C9D2DB', '#6E7A86'], finish: 'metal' },
  gold: { ring: ['#FFF6C2', '#E5AE25', '#845A08'], trim: ['#FFF3B0', '#E5AE25', '#845A08'], gem: '#8FD8FF', finish: 'metal' },
  platinum: { ring: ['#DDFFFA', '#2FB2A8', '#0F5A54'], trim: ['#F2FFFA', '#9FE8DC', '#2F8F86'], gem: '#FF6F9A', finish: 'crystal' },
  diamond: { ring: ['#E8F1FF', '#4C8DF6', '#1B3A8A'], trim: ['#E2EDFF', '#8DB8FF', '#2C5BC0'], gem: '#E9F6FF', finish: 'crystal' },
  champion: { ring: ['#FFD6F2', '#F25CA8', '#9B5CF6', '#4A1C86'], trim: ['#FFF0FB', '#E3B8FF', '#8A4FE0'], gem: '#FF5FAE', finish: 'glow' },
  titan: { ring: ['#FFB3C2', '#E0314F', '#7A0F24'], trim: ['#FFF4B8', '#F2B92E', '#8F5A06'], gem: '#FF3B5C', finish: 'glow' },
};

const ORDER = ['rookie', 'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'titan'];

/** Tier index (0 Rookie … 8 Titan) for a stage. */
export const tierIndex = (stage: Stage) => Math.max(0, ORDER.indexOf(stage.tier.key));

function grey(c: string) {
  const n = parseInt(c.slice(1), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  const v = Math.round(60 + l * 0.55)
    .toString(16)
    .padStart(2, '0');
  return `#${v}${v}${v}`;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number): [number, number] => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))];

/**
 * A game-style avatar frame for a rank stage: a metal ring around a round slot
 * (children render there), with ornaments that escalate by tier and the
 * division on a plate at the bottom. Everything fits in a size×size box.
 *
 * The ring is built from smooth gradients (no segments): a tier-specific
 * metal body, a bevel that catches light on top, a soft lip on the inner
 * edge, and for Silver and up a glint that sweeps around now and then.
 */
export function RankFrame({
  stage,
  size = 64,
  locked,
  compact,
  animate,
  children,
}: {
  stage: Stage;
  size?: number;
  locked?: boolean;
  /** A slim metal ring with a big slot, for list rows and chat heads. */
  compact?: boolean;
  /** Sheen, twinkle and glow motion for higher tiers (default on unless locked). */
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const live = (animate ?? true) && !locked;
  if (compact) return <CompactFrame stage={stage} size={size} locked={locked} id={id} live={live}>{children}</CompactFrame>;
  return <OrnateFrame stage={stage} size={size} locked={locked} id={id} live={live}>{children}</OrnateFrame>;
}

/** Share of `size` taken by the round slot inside a compact frame. */
export const COMPACT_FRAME_SLOT = 0.84;

// ---------------------------------------------------------------------------
// Ring
// ---------------------------------------------------------------------------

type Palette = { ring: string[]; trim: string[]; gem: string; finish: Finish; glow: string };

function palette(stage: Stage, locked?: boolean): Palette {
  const base = LOOKS[stage.tier.key] ?? LOOKS.rookie;
  const k = (c: string) => (locked ? grey(c) : c);
  return { ring: base.ring.map(k), trim: base.trim.map(k), gem: k(base.gem ?? stage.tier.glow), finish: locked ? 'matte' : base.finish, glow: k(stage.tier.glow) };
}

/** Gradient stops for the ring body, by finish. Offsets run along a top-left → bottom-right diagonal. */
function bodyStops({ ring, finish }: Palette): [number, string][] {
  const [hi, mid] = ring;
  const dark = ring[ring.length - 1];
  if (ring.length > 3) {
    // two-hue rings (champion): keep both hues, add a polished band
    return [
      [0, ring[0]],
      [0.3, ring[1]],
      [0.55, mix(ring[1], ring[2], 0.6)],
      [0.78, ring[2]],
      [1, dark],
    ];
  }
  switch (finish) {
    case 'matte':
      return [
        [0, mix(hi, mid, 0.35)],
        [0.5, mid],
        [1, mix(mid, dark, 0.75)],
      ];
    case 'metal':
      return [
        [0, hi],
        [0.22, mix(hi, mid, 0.55)],
        [0.46, mid],
        [0.62, mix(mid, dark, 0.7)],
        [0.8, mid],
        [1, mix(mid, hi, 0.35)],
      ];
    case 'crystal':
      return [
        [0, hi],
        [0.3, mid],
        [0.48, mix(hi, mid, 0.4)],
        [0.66, mid],
        [1, dark],
      ];
    default:
      return [
        [0, hi],
        [0.3, mid],
        [0.62, mix(mid, dark, 0.55)],
        [0.85, mid],
        [1, mix(mid, hi, 0.3)],
      ];
  }
}

/** Shared <Defs> for a ring (ids are suffixed with `id`). */
function RingDefs({ id, pal }: { id: string; pal: Palette }) {
  const matte = pal.finish === 'matte';
  return (
    <>
      <LinearGradient id={`rb${id}`} x1="0.12" y1="0.02" x2="0.88" y2="0.98">
        {bodyStops(pal).map(([o, c]) => (
          <Stop key={o} offset={o} stopColor={c} />
        ))}
      </LinearGradient>
      {/* top bevel: light falls from above and fades out halfway down */}
      <LinearGradient id={`rh${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={matte ? 0.35 : 0.75} />
        <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
      </LinearGradient>
      {/* inner lip: shadowed on top, catching a little light at the bottom */}
      <LinearGradient id={`rl${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#000000" stopOpacity={0.4} />
        <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={matte ? 0.12 : 0.35} />
      </LinearGradient>
      {/* specular streak with feathered ends */}
      <LinearGradient id={`rs${id}`} x1="0" y1="1" x2="1" y2="0">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.85} />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
      </LinearGradient>
      {pal.finish === 'crystal' && (
        // iridescence: soft bands of light and gem tint across the other diagonal
        <LinearGradient id={`ri${id}`} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.18" stopColor="#FFFFFF" stopOpacity={0.4} />
          <Stop offset="0.32" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.55" stopColor={pal.gem} stopOpacity={0.35} />
          <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.86" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      )}
    </>
  );
}

/** The ring itself: shadow, metal body, finish overlay, bevel, lip and fine edges. */
function RingBody({ id, pal, r, w }: { id: string; pal: Palette; r: number; w: number }) {
  const dark = pal.ring[pal.ring.length - 1];
  const outer = r + w / 2;
  const inner = r - w / 2;
  const u = (n: string) => `url(#${n}${id})`;
  return (
    <G>
      {/* soft contact shadow just outside the ring */}
      <Circle cx="50" cy="50" r={outer + 0.4} fill="none" stroke="#000" strokeOpacity={0.1} strokeWidth={1.1} />
      <Circle cx="50" cy="50" r={r} fill="none" stroke={u('rb')} strokeWidth={w} />
      {pal.finish === 'crystal' && <Circle cx="50" cy="50" r={r} fill="none" stroke={u('ri')} strokeWidth={w} />}
      {/* bevel + lip */}
      <Circle cx="50" cy="50" r={outer - w * 0.16} fill="none" stroke={u('rh')} strokeWidth={w * 0.3} />
      <Circle cx="50" cy="50" r={inner + w * 0.14} fill="none" stroke={u('rl')} strokeWidth={w * 0.28} />
      {/* fine edges, half-tone so they read as a crisp but soft line */}
      <Circle cx="50" cy="50" r={outer} fill="none" stroke={dark} strokeOpacity={0.6} strokeWidth={0.55} />
      <Circle cx="50" cy="50" r={inner} fill="none" stroke={dark} strokeOpacity={0.75} strokeWidth={0.6} />
      {pal.finish !== 'matte' && (
        <Path d={describeArc(r + w * 0.12, 196, 258)} fill="none" stroke={u('rs')} strokeWidth={w * 0.3} />
      )}
      {pal.finish !== 'matte' && (
        <Path d={describeArc(r - w * 0.1, 16, 58)} fill="none" stroke={u('rs')} strokeOpacity={0.45} strokeWidth={w * 0.2} />
      )}
    </G>
  );
}

// ---------------------------------------------------------------------------
// Motion (all transform/opacity on Animated.Views, so it runs on the native driver)
// ---------------------------------------------------------------------------

/** A bright arc that sweeps once around the ring, then rests. */
function Glint({ size, r, w, id, delay, strength = 0.9 }: { size: number; r: number; w: number; id: string; delay: number; strength?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver }),
        Animated.delay(3600),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ]),
    );
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
          opacity: v.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, strength, strength, 0] }),
          transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '320deg'] }) }],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`gl${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={describeArc(r, 238, 302)} fill="none" stroke={`url(#gl${id})`} strokeWidth={w * 0.7} />
      </Svg>
    </Animated.View>
  );
}

/** A four-point sparkle that pops in and out. Position in 0–100 frame units. */
function Twinkle({ size, x, y, s, delay, color = '#FFFFFF' }: { size: number; x: number; y: number; s: number; delay: number; color?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.delay(2600),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v, delay]);
  const px = (s * size) / 100;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (x * size) / 100 - px / 2,
        top: (y * size) / 100 - px / 2,
        width: px,
        height: px,
        opacity: v,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
      }}
    >
      <Svg width={px} height={px} viewBox="0 0 10 10">
        <Path d="M5 0 Q5.6 4.4 10 5 Q5.6 5.6 5 10 Q4.4 5.6 0 5 Q4.4 4.4 5 0 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** A soft halo that breathes behind glowing tiers. */
function Halo({ size, color, id, live, r0, r1 }: { size: number; color: string; id: string; live: boolean; r0: number; r1: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, live]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`ha${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset={r0} stopColor={color} stopOpacity={0} />
            <Stop offset={(r0 + r1) / 2} stopColor={color} stopOpacity={0.55} />
            <Stop offset={r1} stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#ha${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Stagger start times so a list of frames doesn't flash in unison. */
const phase = (stage: Stage, id: string) => ((stage.index * 7 + id.length * 13 + id.charCodeAt(id.length - 1)) % 9) * 380;

// ---------------------------------------------------------------------------
// Compact
// ---------------------------------------------------------------------------

function CompactFrame({ stage, size, locked, id, live, children }: { stage: Stage; size: number; locked?: boolean; id: string; live: boolean; children?: React.ReactNode }) {
  const t = tierIndex(stage);
  const pal = palette(stage, locked);
  const slot = size * COMPACT_FRAME_SLOT;
  // Thicker ring on bigger frames so it reads as metal, not a hairline.
  const w = size >= 64 ? 7 : 8.5;
  const r = 50 - w / 2 - 0.6;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: (size - slot) / 2,
          top: (size - slot) / 2,
          width: slot,
          height: slot,
          borderRadius: slot / 2,
          overflow: 'hidden',
          backgroundColor: '#15181E',
          opacity: locked ? 0.6 : 1,
        }}
      >
        {children}
      </View>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <RingDefs id={id} pal={pal} />
          <RadialGradient id={`cs${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.86" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.35} />
          </RadialGradient>
        </Defs>
        {/* inner shadow so the picture sits inside the ring */}
        <Circle cx="50" cy="50" r={r - w / 2 + 0.2} fill={`url(#cs${id})`} />
        <RingBody id={id} pal={pal} r={r} w={w} />
        {pal.finish === 'glow' && <Circle cx="50" cy="50" r={r} fill="none" stroke={pal.glow} strokeOpacity={0.35} strokeWidth={w * 0.35} />}
        {t >= 4 && (
          <G>
            <Polygon points={`50,${w * 0.05} ${50 + w * 0.55},${w / 2 + 0.6} 50,${w + 1.2} ${50 - w * 0.55},${w / 2 + 0.6}`} fill={pal.gem} stroke={pal.trim[2]} strokeWidth={0.6} strokeLinejoin="round" />
            <Polygon points={`50,${w * 0.05} 50,${w + 1.2} ${50 - w * 0.55},${w / 2 + 0.6}`} fill="#fff" opacity={0.35} />
          </G>
        )}
      </Svg>
      {live && t >= 3 && <Glint size={size} r={r} w={w} id={`c${id}`} delay={phase(stage, id)} strength={pal.finish === 'metal' ? 0.75 : 0.95} />}
      {live && t >= 5 && size >= 40 && <Twinkle size={size} x={84} y={20} s={16} delay={phase(stage, id) + 900} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ornate
// ---------------------------------------------------------------------------

function OrnateFrame({ stage, size, locked, id, live, children }: { stage: Stage; size: number; locked?: boolean; id: string; live: boolean; children?: React.ReactNode }) {
  const { tier, division } = stage;
  const t = tierIndex(stage);
  const pal = palette(stage, locked);
  const k = (c: string) => (locked ? grey(c) : c);
  const { ring, trim, gem } = pal;
  const ringDark = ring[ring.length - 1];
  const u = (name: string) => `url(#${name}${id})`;
  const R = 28;
  const W = 6.6;

  const gemAt = (x: number, y: number, g: number) => (
    <G key={`${x}-${y}`}>
      <Circle cx={x} cy={y} r={g + 1.6} fill={u('tr')} stroke={trim[2]} strokeWidth={0.6} />
      <Circle cx={x} cy={y} r={g + 1.6} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.5} />
      <Polygon points={`${x},${y - g * 1.25} ${x + g},${y} ${x},${y + g * 1.25} ${x - g},${y}`} fill={gem} />
      <Polygon points={`${x},${y - g * 1.25} ${x},${y + g * 1.25} ${x - g},${y}`} fill="#fff" opacity={0.35} />
      <Polygon points={`${x},${y - g * 1.25} ${x + g},${y} ${x - g},${y}`} fill="#fff" opacity={0.25} />
      <Polygon points={`${x},${y - g * 1.25} ${x + g},${y} ${x},${y + g * 1.25} ${x - g},${y}`} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={0.5} strokeLinejoin="round" />
    </G>
  );

  /** Left wing of feathers fanning out from (24,50); mirrored for the right. */
  const wing = (lens: number[], angles: number[]) =>
    lens.map((len, i) => {
      const a = angles[i];
      const [dx, dy] = [Math.cos(rad(a)), Math.sin(rad(a))];
      const cx = 24 + (dx * len) / 2;
      const cy = 50 + (dy * len) / 2;
      return <Ellipse key={i} cx={cx} cy={cy} rx={len / 2} ry={Math.max(2.2, len * 0.17)} transform={`rotate(${a} ${cx} ${cy})`} fill={u('tb')} stroke={trim[2]} strokeWidth={0.6} />;
    });
  const wings = (big: boolean) => {
    const w = big ? wing([26, 23, 20, 16, 12], [218, 203, 188, 173, 158]) : wing([18, 15, 11], [206, 189, 172]);
    return (
      <G>
        <G>{w}</G>
        <G transform="translate(100 0) scale(-1 1)">{w}</G>
      </G>
    );
  };

  /** Two laurel branches curling up from the bottom around the ring. */
  const laurel = () => {
    const out: React.ReactNode[] = [];
    for (const side of [-1, 1]) {
      const from = 90 - side * 12;
      const to = 90 - side * 118;
      const [sx, sy] = polar(35.5, from);
      const [ex, ey] = polar(35.5, to);
      out.push(<Path key={`st${side}`} d={`M${sx.toFixed(2)} ${sy.toFixed(2)} A35.5 35.5 0 0 ${side < 0 ? 1 : 0} ${ex.toFixed(2)} ${ey.toFixed(2)}`} fill="none" stroke={trim[2]} strokeWidth={1.1} strokeLinecap="round" />);
      for (let i = 0; i < 6; i++) {
        const deg = 90 - side * (20 + i * 17);
        const up = deg - side * 90; // tangent pointing up the branch
        for (const off of [-1, 1]) {
          const [x, y] = polar(35.5 + off * 2.6, deg - side * 2);
          const rot = up + off * side * 28;
          out.push(<Ellipse key={`${side}${i}${off}`} cx={x} cy={y} rx={4.2} ry={1.8} transform={`rotate(${rot.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})`} fill={u('tb')} stroke={trim[2]} strokeWidth={0.5} />);
        }
      }
    }
    return <G>{out}</G>;
  };

  const sunburst = () => {
    const pts: string[] = [];
    const n = 16;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? (i % 4 === 0 ? 42 : 37) : 29;
      const [x, y] = polar(r, -90 + (i * 180) / n);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return <Polygon points={pts.join(' ')} fill={u('tb')} stroke={trim[2]} strokeWidth={0.6} strokeLinejoin="round" />;
  };

  const rays = () =>
    Array.from({ length: 12 }, (_, i) => {
      const deg = -75 + i * 30;
      const [x1, y1] = polar(29, deg - 6);
      const [x2, y2] = polar(48, deg);
      const [x3, y3] = polar(29, deg + 6);
      return <Polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={u('ry')} />;
    });

  const studs = [45, 135, 225, 315].map((d) => polar(R, d));
  const slot = size * RANK_FRAME_SLOT;
  const glowing = pal.finish === 'glow' || pal.finish === 'crystal';

  return (
    <View style={{ width: size, height: size }}>
      {glowing && <Halo size={size} color={pal.glow} id={id} live={live} r0={pal.finish === 'glow' ? 0.5 : 0.56} r1={pal.finish === 'glow' ? 0.98 : 0.8} />}
      {/* behind the slot: ornaments */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={`tb${id}`} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={trim[0]} />
            <Stop offset="0.5" stopColor={trim[1]} />
            <Stop offset="1" stopColor={trim[2]} />
          </LinearGradient>
          <RadialGradient id={`ry${id}`} cx="50" cy="50" r="48" fx="50" fy="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0.55" stopColor={trim[1]} stopOpacity={0.8} />
            <Stop offset="1" stopColor={trim[0]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {t >= 8 && <G>{rays()}</G>}
        {t === 6 && sunburst()}
        {t >= 7 && wings(true)}
        {t === 3 && wings(false)}
        {(t === 5 || t === 7) && laurel()}
      </Svg>

      <View
        style={{
          position: 'absolute',
          left: (size - slot) / 2,
          top: (size - slot) / 2,
          width: slot,
          height: slot,
          borderRadius: slot / 2,
          overflow: 'hidden',
          backgroundColor: '#15181E',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: locked ? 0.6 : 1,
        }}
      >
        {children}
      </View>

      {/* over the slot: the ring and its jewels */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <RingDefs id={id} pal={pal} />
          <LinearGradient id={`tr${id}`} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={trim[0]} />
            <Stop offset="0.5" stopColor={trim[1]} />
            <Stop offset="1" stopColor={trim[2]} />
          </LinearGradient>
          <RadialGradient id={`sh${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.78" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.45} />
          </RadialGradient>
        </Defs>
        {/* inner shadow on the slot edge */}
        <Circle cx="50" cy="50" r={R - W / 2 + 0.2} fill={u('sh')} />
        <RingBody id={id} pal={pal} r={R} w={W} />
        {t === 8 && <Circle cx="50" cy="50" r={R + W / 2 + 0.3} fill="none" stroke={trim[1]} strokeWidth={1.1} />}
        {t === 8 && <Circle cx="50" cy="50" r={R - W / 2 - 0.2} fill="none" stroke={trim[1]} strokeWidth={0.9} />}

        {t === 2 &&
          studs.map(([x, y], i) => (
            <G key={i}>
              <Circle cx={x} cy={y + 0.4} r="2.5" fill="#000" opacity={0.2} />
              <Circle cx={x} cy={y} r="2.4" fill={u('tr')} stroke={trim[2]} strokeWidth={0.6} />
              <Circle cx={x - 0.7} cy={y - 0.7} r="0.8" fill="#fff" opacity={0.8} />
            </G>
          ))}
        {t >= 4 && t !== 8 && gemAt(50, 19.5, t >= 6 ? 4.2 : 3.6)}
        {t >= 4 && (
          <G>
            {gemAt(19.5, 50, t >= 6 ? 3.6 : 3.2)}
            {gemAt(80.5, 50, t >= 6 ? 3.6 : 3.2)}
          </G>
        )}
        {t >= 8 && (
          <G>
            <Path d="M35 22 L33 7 L42 13.5 L50 3 L58 13.5 L67 7 L65 22 Q50 18 35 22 Z" fill={u('tr')} stroke={trim[2]} strokeWidth={0.8} strokeLinejoin="round" />
            <Path d="M36 19.5 Q50 16 64 19.5" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.8} fill="none" />
            <Circle cx="33" cy="7" r="1.9" fill={gem} />
            <Circle cx="50" cy="3.4" r="2.2" fill={gem} />
            <Circle cx="67" cy="7" r="1.9" fill={gem} />
            {gemAt(50, 15, 2.6)}
          </G>
        )}
      </Svg>

      {live && t >= 3 && <Glint size={size} r={R} w={W} id={`o${id}`} delay={phase(stage, id)} strength={pal.finish === 'metal' ? 0.7 : 0.95} />}

      {/* the plate sits in front of everything, glint included */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id={`pl${id}`} x1="0" y1="0" x2="0" y2="1">
            {bodyStops(pal).map(([o, c], i, a) => (
              <Stop key={o} offset={i / (a.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        {t >= 5 && <Path d="M36 79 L27 79 L30 83.5 L27 88 L38 88 Z M64 79 L73 79 L70 83.5 L73 88 L62 88 Z" fill={k(tier.color)} stroke={ringDark} strokeWidth={0.6} strokeLinejoin="round" opacity={0.92} />}
        <Path d="M38 77 L62 77 L65.5 83 L62 89 L38 89 L34.5 83 Z" fill={u('pl')} stroke={ringDark} strokeWidth={0.8} strokeLinejoin="round" />
        <Path d="M39 78.5 L61 78.5" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.8} strokeLinecap="round" />
        {division ? (
          <SvgText x="50" y="86.6" fontSize="9.5" fontFamily={FONTS.extrabold} fontWeight="800" fill="#fff" stroke="#000" strokeOpacity={0.35} strokeWidth={0.4} textAnchor="middle">
            {division}
          </SvgText>
        ) : (
          <Polygon points={starPoints(50, 83, 4.6, 2)} fill="#fff" stroke="#000" strokeOpacity={0.3} strokeWidth={0.4} />
        )}
      </Svg>

      {live && pal.finish === 'crystal' && (
        <>
          <Twinkle size={size} x={29} y={27} s={9} delay={phase(stage, id) + 600} />
          <Twinkle size={size} x={76} y={66} s={7} delay={phase(stage, id) + 2100} color={mix(pal.trim[0], '#FFFFFF', 0.5)} />
        </>
      )}
      {live && pal.finish === 'glow' && (
        <>
          <Twinkle size={size} x={24} y={30} s={8} delay={phase(stage, id) + 400} />
          <Twinkle size={size} x={77} y={34} s={10} delay={phase(stage, id) + 1700} color={mix(pal.glow, '#FFFFFF', 0.4)} />
          <Twinkle size={size} x={70} y={74} s={6} delay={phase(stage, id) + 2900} />
        </>
      )}
    </View>
  );
}

function describeArc(r: number, from: number, to: number) {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function starPoints(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? R : r;
    const a = rad(-90 + i * 36);
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
