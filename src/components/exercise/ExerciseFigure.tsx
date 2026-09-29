import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { Equipment, Exercise, Muscle } from '@/lib/types';
import { findExercise } from '@/lib/training';
import { exerciseInfo, libraryMatch, type MuscleRegion } from '@/lib/exerciseInfo';
import { useTheme, type Colors } from '@/theme';
import { mix, muscleAccent } from './MuscleMap';

/*
 * A small illustrated person doing an exercise. The body is a rig of tapered
 * limbs driven by joint angles (or a target point, solved with two-bone IK),
 * posed by one of a set of archetypes, with the equipment anchored to the
 * rig's joints so it always lines up with the hands, hips and feet. The worked
 * muscles (primary, from exerciseInfo) are shaded on the limbs in the accent.
 * Everything is authored on a 100 × 100 grid and fitted into the tile.
 */

// ---------------------------------------------------------------- geometry

type P = { x: number; y: number };
const pt = (x: number, y: number): P => ({ x, y });
const add = (a: P, b: P): P => pt(a.x + b.x, a.y + b.y);
const sub = (a: P, b: P): P => pt(a.x - b.x, a.y - b.y);
const mul = (a: P, k: number): P => pt(a.x * k, a.y * k);
const len = (a: P) => Math.hypot(a.x, a.y);
const unit = (a: P): P => {
  const l = len(a) || 1;
  return pt(a.x / l, a.y / l);
};
const perp = (a: P): P => pt(-a.y, a.x);
const RAD = Math.PI / 180;
const dir = (deg: number): P => pt(Math.cos(deg * RAD), Math.sin(deg * RAD));
const angleOf = (a: P) => Math.atan2(a.y, a.x) / RAD;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: P, b: P, t: number): P => pt(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
const n2 = (v: number) => Math.round(v * 100) / 100;
const S = (a: P) => `${n2(a.x)} ${n2(a.y)}`;

/** A smooth closed path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts: P[], closed = true, tension = 1): string {
  const n = pts.length;
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${S(pts[0])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1 = add(p1, mul(sub(p2, p0), tension / 6));
    const c2 = sub(p2, mul(sub(p3, p1), tension / 6));
    d += ` C${S(c1)} ${S(c2)} ${S(p2)}`;
  }
  return closed ? d + 'Z' : d;
}

/**
 * A tapered, rounded limb from A (radius rA) to B (radius rB). `pe`/`me` add
 * extra width on the +normal / −normal side at one and two thirds of the way,
 * which is how muscle bellies (chest, calf, quads) get their shape.
 */
class Seg {
  d: P;
  n: P;
  L: number;
  constructor(public A: P, public B: P, public rA: number, public rB: number, public pe: [number, number] = [0, 0], public me: [number, number] = [0, 0]) {
    const v = sub(B, A);
    this.L = len(v) || 0.001;
    this.d = unit(v);
    this.n = perp(this.d);
  }
  at(t: number, off: number): P {
    return add(add(this.A, mul(this.d, t * this.L)), mul(this.n, off));
  }
  /** Half-width at t on side s (+1 / −1). */
  w(t: number, s: number): number {
    const tt = Math.max(0, Math.min(1, t));
    const e = s > 0 ? this.pe : this.me;
    const v = [this.rA, lerp(this.rA, this.rB, 1 / 3) + e[0], lerp(this.rA, this.rB, 2 / 3) + e[1], this.rB];
    const u = 1 - tt;
    return u * u * u * v[0] + 3 * u * u * tt * v[1] + 3 * u * tt * tt * v[2] + tt * tt * tt * v[3];
  }
  path(): string {
    const { rA, rB, pe, me } = this;
    const p1 = lerp(rA, rB, 1 / 3) + pe[0];
    const p2 = lerp(rA, rB, 2 / 3) + pe[1];
    const m1 = lerp(rA, rB, 1 / 3) + me[0];
    const m2 = lerp(rA, rB, 2 / 3) + me[1];
    return (
      `M${S(this.at(0, rA))} C${S(this.at(1 / 3, p1))} ${S(this.at(2 / 3, p2))} ${S(this.at(1, rB))}` +
      ` A${n2(rB)} ${n2(rB)} 0 0 0 ${S(this.at(1, -rB))}` +
      ` C${S(this.at(2 / 3, -m2))} ${S(this.at(1 / 3, -m1))} ${S(this.at(0, -rA))}` +
      ` A${n2(rA)} ${n2(rA)} 0 0 0 ${S(this.at(0, rA))}Z`
    );
  }
  /** The first `t` of this limb, a touch wider (sleeves, shorts). */
  part(t0: number, t1: number, grow = 0.35): Seg {
    const A = this.at(t0, 0);
    const B = this.at(t1, 0);
    return new Seg(A, B, this.w(t0, 1) + grow, this.w(t1, 1) + grow);
  }
  /** A muscle belly inside the limb between t0 and t1, on side s (+1, −1, or 0 for centred). */
  lens(t0: number, t1: number, s: number, k = 0.82): string {
    const N = 8;
    const outer: P[] = [];
    const inner: P[] = [];
    for (let j = 0; j <= N; j++) {
      const t = t0 + ((t1 - t0) * j) / N;
      const f = Math.pow(Math.sin((Math.PI * j) / N), 0.6);
      if (s === 0) {
        outer.push(this.at(t, k * this.w(t, 1) * f));
        inner.push(this.at(t, -k * this.w(t, -1) * f));
      } else {
        const w = this.w(t, s);
        const base = 0.1 * w;
        outer.push(this.at(t, s * (base + (k * w - base) * f)));
        inner.push(this.at(t, s * (base + 0.12 * w * f)));
      }
    }
    return smooth([...outer, ...inner.slice(1, -1).reverse()]);
  }
  pts(): P[] {
    const r = Math.max(this.rA, this.rB) + 1.2;
    return [add(this.A, pt(-r, -r)), add(this.A, pt(r, r)), add(this.B, pt(-r, -r)), add(this.B, pt(r, r))];
  }
}

// ---------------------------------------------------------------- the rig

const TORSO = 24;
const NECK = 7;
const HEAD_R = 5;
const UA = 13.5;
const FA = 12.5;
const TH = 19;
const SH = 18.5;
const FOOT = 6.4;

type Limb = [number, number] | { to: [number, number]; bend?: 1 | -1 };

interface Pose {
  view?: 'side' | 'front' | 'back';
  hip: [number, number];
  /** Direction from hip to neck, degrees (0 = right, 90 = down, −90 = up). */
  torso?: number;
  head?: number;
  /** Near (side view) or viewer-left (front/back) arm and leg; the second is the far / right one. */
  arm: Limb;
  arm2?: Limb;
  leg: Limb;
  leg2?: Limb;
  foot?: number;
  foot2?: number;
  /** Foreshortening: [upper, lower] length scale. */
  armScale?: [number, number];
  arm2Scale?: [number, number];
  legScale?: [number, number];
  leg2Scale?: [number, number];
  torsoScale?: number;
  /** Mirror so the figure faces left. */
  flip?: boolean;
  /** Where the floor is: 'auto' puts it under the lowest point, false hides it. */
  ground?: 'auto' | false | number;
}

interface Rig {
  view: 'side' | 'front' | 'back';
  hip: P;
  neck: P;
  d: P;
  n: P;
  head: P;
  headDir: P;
  shoulder: [P, P];
  elbow: [P, P];
  wrist: [P, P];
  hipJ: [P, P];
  knee: [P, P];
  ankle: [P, P];
  toe: [P, P];
  torso: Seg;
  upper: [Seg, Seg];
  fore: [Seg, Seg];
  thigh: [Seg, Seg];
  shin: [Seg, Seg];
}

function solve(base: P, limb: Limb, l1: number, l2: number, defaultBend: 1 | -1): [P, P] {
  if (Array.isArray(limb)) {
    const mid = add(base, mul(dir(limb[0]), l1));
    return [mid, add(mid, mul(dir(limb[1]), l2))];
  }
  const T = pt(limb.to[0], limb.to[1]);
  const v = sub(T, base);
  const dd = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.001, len(v)));
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))));
  const base0 = Math.atan2(v.y, v.x);
  const bend = limb.bend ?? defaultBend;
  const mid = add(base, mul(pt(Math.cos(base0 + bend * a), Math.sin(base0 + bend * a)), l1));
  const end = add(mid, mul(unit(sub(T, mid)), l2));
  return [mid, end];
}

function buildRig(pose: Pose): Rig {
  const view = pose.view ?? 'side';
  const hip = pt(pose.hip[0], pose.hip[1]);
  const tAng = pose.torso ?? -90;
  const d = dir(tAng);
  const n = perp(d);
  const tl = TORSO * (pose.torsoScale ?? 1);
  const neck = add(hip, mul(d, tl));
  const headDir = dir(pose.head ?? tAng);
  const head = add(neck, mul(headDir, NECK * (view === 'back' && (pose.torsoScale ?? 1) < 1 ? 0.35 : 1)));
  const side = view === 'side';
  const sh = (i: number): P => (side ? add(hip, mul(d, tl * 0.86)) : add(add(hip, mul(d, tl - 3.6)), mul(n, i === 0 ? -7.4 : 7.4)));
  const hj = (i: number): P => (side ? hip : add(add(hip, mul(d, -0.6)), mul(n, i === 0 ? -3.9 : 3.9)));
  const shoulder: [P, P] = [sh(0), sh(1)];
  const hipJ: [P, P] = [hj(0), hj(1)];
  const as = [pose.armScale ?? [1, 1], pose.arm2Scale ?? pose.armScale ?? [1, 1]];
  const ls = [pose.legScale ?? [1, 1], pose.leg2Scale ?? pose.legScale ?? [1, 1]];
  const arms = [pose.arm, pose.arm2 ?? pose.arm];
  const legs = [pose.leg, pose.leg2 ?? pose.leg];
  const armJ = arms.map((l, i) => solve(shoulder[i], l, UA * as[i][0], FA * as[i][1], 1));
  const legJ = legs.map((l, i) => solve(hipJ[i], l, TH * ls[i][0], SH * ls[i][1], -1));
  const feet = [pose.foot ?? 0, pose.foot2 ?? pose.foot ?? 0];
  const elbow: [P, P] = [armJ[0][0], armJ[1][0]];
  const wrist: [P, P] = [armJ[0][1], armJ[1][1]];
  const knee: [P, P] = [legJ[0][0], legJ[1][0]];
  const ankle: [P, P] = [legJ[0][1], legJ[1][1]];
  const fl = side ? FOOT : 3.2;
  const toe: [P, P] = [add(ankle[0], mul(dir(feet[0]), fl)), add(ankle[1], mul(dir(feet[1]), fl))];

  const torso = side
    ? new Seg(add(hip, mul(d, -2.2)), add(neck, mul(d, -0.6)), 5.4, 5.2, [0.6, 3.2], [1.0, 2.3])
    : new Seg(add(hip, mul(d, -2)), neck, 6.4, 8, [0, 0], [0, 0]);
  const upper = [0, 1].map((i) => new Seg(shoulder[i], elbow[i], side ? 3.4 : 3.2, 2.2, [0.8, 0.2], [0.6, 0.5])) as [Seg, Seg];
  const fore = [0, 1].map((i) => new Seg(elbow[i], wrist[i], 2.25, 1.45, [0.55, 0.1], [0.45, 0.1])) as [Seg, Seg];
  const thigh = [0, 1].map((i) => new Seg(hipJ[i], knee[i], side ? 4.5 : 4.5, 3.0, [0.5, 0.3], side ? [1.1, 0.7] : [0.6, 0.4])) as [Seg, Seg];
  const shin = [0, 1].map((i) => new Seg(knee[i], ankle[i], 2.9, 1.5, side ? [1.5, 0.3] : [0.7, 0.2], [0.3, 0])) as [Seg, Seg];
  return { view, hip, neck, d, n, head, headDir, shoulder, elbow, wrist, hipJ, knee, ankle, toe, torso, upper, fore, thigh, shin };
}

// ---------------------------------------------------------------- scene building

interface Pal {
  skin: string;
  skinFar: string;
  cloth: string;
  clothFar: string;
  hi: string;
  hiFar: string;
  metal: string;
  metalDark: string;
  plate: string;
  plateRim: string;
  pad: string;
  cable: string;
  shadow: string;
  tileTop: string;
  tileBottom: string;
  sheen: number;
}

type Layer = 'back' | 'far' | 'mid' | 'body' | 'front';

class Scene {
  back: React.ReactNode[] = [];
  far: React.ReactNode[] = [];
  mid: React.ReactNode[] = [];
  body: React.ReactNode[] = [];
  front: React.ReactNode[] = [];
  pts: P[] = [];
  private k = 0;
  constructor(public pal: Pal) {}
  key() {
    return `e${this.k++}`;
  }
  push(layer: Layer, el: React.ReactElement, pts: P[]) {
    this[layer].push(React.cloneElement(el, { key: this.key() }));
    this.pts.push(...pts);
  }
  // primitives
  path(layer: Layer, d: string, fill: string, pts: P[], extra: Record<string, unknown> = {}) {
    this.push(layer, <Path d={d} fill={fill} {...extra} />, pts);
  }
  line(layer: Layer, a: P, b: P, w: number, color: string) {
    this.push(layer, <Line x1={n2(a.x)} y1={n2(a.y)} x2={n2(b.x)} y2={n2(b.y)} stroke={color} strokeWidth={w} strokeLinecap="round" />, [a, b]);
  }
  circle(layer: Layer, c: P, r: number, fill: string, extra: Record<string, unknown> = {}) {
    this.push(layer, <Circle cx={n2(c.x)} cy={n2(c.y)} r={n2(r)} fill={fill} {...extra} />, [add(c, pt(-r, -r)), add(c, pt(r, r))]);
  }
  /** A rounded bar from a to b of thickness w (pads, benches, frames). */
  bar(layer: Layer, a: P, b: P, w: number, fill: string) {
    const s = new Seg(a, b, w / 2, w / 2);
    this.path(layer, s.path(), fill, s.pts());
  }
  /** A pad: rounded rectangle along a→b, thickness w, with corner radius r. */
  pad(layer: Layer, a: P, b: P, w: number, fill: string, r = 1.6) {
    const d = unit(sub(b, a));
    const n = perp(d);
    const h = w / 2;
    const rr = Math.min(r, h);
    const c = [add(a, mul(n, h)), add(b, mul(n, h)), add(b, mul(n, -h)), add(a, mul(n, -h))];
    const p = (q: P, dd: P, k: number) => add(q, mul(dd, k));
    const dpath =
      `M${S(p(c[0], d, rr))} L${S(p(c[1], d, -rr))} Q${S(c[1])} ${S(p(c[1], n, -rr))}` +
      ` L${S(p(c[2], n, rr))} Q${S(c[2])} ${S(p(c[2], d, -rr))}` +
      ` L${S(p(c[3], d, rr))} Q${S(c[3])} ${S(p(c[3], n, rr))}` +
      ` L${S(p(c[0], n, -rr))} Q${S(c[0])} ${S(p(c[0], d, rr))}Z`;
    this.path(layer, dpath, fill, c);
  }

  // equipment
  /**
   * A barbell seen from the side: the near plate at `c`, a short stretch of bar
   * and the far plate peeking out behind the body along `toward` (the direction
   * the bar recedes into the scene).
   */
  barbell(bar: P, r = 8, toward: P = pt(0.62, -0.5), shift = 0) {
    const { plate, plateRim, metal } = this.pal;
    r *= 0.84;
    // `shift` slides the near plate toward the viewer along the bar, off the body
    const c = sub(bar, mul(toward, shift));
    const far = add(bar, mul(toward, 5.2));
    this.line('back', add(far, mul(toward, 1.6)), bar, 1.5, metal);
    this.line('front', bar, c, 1.5, metal);
    this.circle('back', far, r * 0.94, plateRim);
    this.circle('back', far, r * 0.94 - 0.9, plate);
    this.line('front', c, sub(c, mul(toward, 2.4)), 1.7, metal);
    this.circle('front', add(c, mul(toward, 0.7)), r, plateRim);
    this.circle('front', c, r, plate);
    this.circle('front', c, r * 0.72, 'none', { stroke: plateRim, strokeWidth: 0.7 });
    this.circle('front', c, 1.5, metal);
  }
  /** A barbell seen from the front: horizontal bar with plates edge-on. */
  barbellFront(c: P, half = 24, r = 8) {
    const { plate, plateRim, metal } = this.pal;
    this.line('front', add(c, pt(-half - 3, 0)), add(c, pt(half + 3, 0)), 1.5, metal);
    for (const s of [-1, 1]) {
      const x = c.x + s * half;
      this.pad('front', pt(x - 1.6, c.y), pt(x + 1.6, c.y), r * 2, plate, 1.2);
      this.pad('front', pt(x + s * 2.2 - 0.9, c.y), pt(x + s * 2.2 + 0.9, c.y), r * 1.5, plateRim, 0.8);
    }
  }
  /** A dumbbell centred on the hand, handle along `angle` (degrees). */
  dumbbell(layer: Layer, c: P, angle = -20, size = 1) {
    const { plate, metal } = this.pal;
    const d = dir(angle);
    const n = perp(d);
    const hl = 3.4 * size;
    this.line(layer, add(c, mul(d, -hl)), add(c, mul(d, hl)), 1.5 * size, metal);
    for (const s of [-1, 1]) {
      const m = add(c, mul(d, s * (hl + 0.4 * size)));
      this.pad(layer, add(m, mul(d, -1.5 * size)), add(m, mul(d, 1.5 * size)), 6.2 * size, plate, 1.3 * size);
      this.pad(layer, add(add(m, mul(d, s * 1.2 * size)), mul(n, 0)), add(m, mul(d, s * 1.9 * size)), 4.6 * size, plate, 1 * size);
    }
  }
  kettlebell(layer: Layer, hand: P, hang: P = pt(0, 1)) {
    const { plate, metal } = this.pal;
    const h = unit(hang);
    const c = add(hand, mul(h, 5.6));
    const n = perp(h);
    const a = add(hand, mul(n, -2.4));
    const b = add(hand, mul(n, 2.4));
    this.path(layer, `M${S(add(a, mul(h, 2.6)))} Q${S(add(hand, mul(h, -2.2)))} ${S(add(b, mul(h, 2.6)))}`, 'none', [a, b], { stroke: metal, strokeWidth: 1.5 });
    this.circle(layer, c, 4.2, plate);
    this.path(layer, `M${S(add(c, mul(n, -4.1)))} L${S(add(c, mul(n, 4.1)))} L${S(add(add(c, mul(n, 3)), mul(h, 3.4)))} L${S(add(add(c, mul(n, -3)), mul(h, 3.4)))}Z`, plate, []);
  }
  /** A cable column at x, from the floor up to `top`, with a pulley at `pulley` and the cable running to `to`. */
  cable(x: number, floor: number, top: number, pulley: P, to: P, handle: 'bar' | 'rope' | 'd' | 'none' = 'd', handleAngle = 0) {
    const { metal, metalDark, cable, pad } = this.pal;
    this.bar('back', pt(x, floor), pt(x, top), 3.2, metal);
    // weight stack
    const sy = floor - 3;
    for (let i = 0; i < 5; i++) this.pad('back', pt(x - 0.1, sy - i * 2.1 - 0.9), pt(x + 0.1, sy - i * 2.1 - 0.9), 1.6, metalDark, 0.4);
    this.pad('back', pt(x - 3.8, sy - 5), pt(x + 3.8, sy - 5), 10.6, pad, 1.4);
    for (let i = 0; i < 4; i++) this.line('back', pt(x - 3.2, sy - 1.3 - i * 2.4), pt(x + 3.2, sy - 1.3 - i * 2.4), 0.5, metal);
    const arm = pt(pulley.x, top);
    if (Math.abs(pulley.x - x) > 1) this.bar('back', pt(x, top), arm, 2.6, metal);
    if (Math.abs(pulley.y - top) > 1) this.bar('back', arm, pulley, 2.2, metal);
    this.line('mid', pulley, to, 0.9, cable);
    this.circle('mid', pulley, 2, metalDark);
    this.circle('mid', pulley, 0.8, metal);
    if (handle === 'bar') {
      const d = dir(handleAngle);
      this.bar('front', add(to, mul(d, -4.5)), add(to, mul(d, 4.5)), 1.5, metalDark);
    } else if (handle === 'rope') {
      const d = dir(handleAngle);
      this.bar('front', add(to, mul(d, -1)), add(to, mul(d, 3.8)), 1.9, metalDark);
    } else if (handle === 'd') {
      this.circle('front', to, 2.1, 'none', { stroke: metalDark, strokeWidth: 1.1 });
    }
  }
  /** Flat bench pad from x0 to x1 with its top at y, standing on the floor. */
  bench(x0: number, x1: number, y: number, floor: number) {
    const { pad, metal } = this.pal;
    const inset = (x1 - x0) * 0.18;
    for (const x of [x0 + inset, x1 - inset]) {
      this.bar('back', pt(x, y + 2), pt(x, floor), 2.1, metal);
      this.bar('back', pt(x - 3, floor - 0.6), pt(x + 3, floor - 0.6), 1.4, metal);
    }
    this.pad('back', pt(x0, y + 1.6), pt(x1, y + 1.6), 3.4, pad, 1.4);
  }
}

// ---------------------------------------------------------------- drawing the body

function head(sc: Scene, r: Rig, far = false) {
  const { skin, cloth } = sc.pal;
  const h = r.headDir;
  const fwd = perp(h);
  const c = r.head;
  if (r.view === 'side') {
    // neck, head, hair cap on the back of the skull, and a hint of a nose
    const neck = new Seg(r.neck, add(r.neck, mul(h, NECK * 0.7)), 2.3, 2.1);
    sc.path('body', neck.path(), skin, neck.pts());
    sc.path('body', smooth([add(c, mul(h, 1.2)), add(c, add(mul(h, -HEAD_R), mul(fwd, -1.2))), add(c, add(mul(h, -0.5), mul(fwd, 5.2))), add(c, add(mul(h, HEAD_R * 0.9), mul(fwd, 3.2)))]), skin, [add(c, pt(-6, -6)), add(c, pt(6, 6))]);
    sc.circle('body', c, HEAD_R, skin);
    sc.circle('body', add(c, add(mul(fwd, HEAD_R * 0.88), mul(h, -0.4))), 1.05, skin);
    const back = mul(fwd, -1);
    const a0 = add(c, add(mul(h, HEAD_R * 0.98), mul(fwd, HEAD_R * 0.18)));
    const a1 = add(c, add(mul(h, HEAD_R * 0.55), mul(back, HEAD_R * 0.9)));
    const a2 = add(c, add(mul(h, -HEAD_R * 0.55), mul(back, HEAD_R * 0.98)));
    const a3 = add(c, add(mul(h, -HEAD_R * 0.3), mul(back, HEAD_R * 0.2)));
    sc.path('body', `M${S(a0)} Q${S(add(c, add(mul(h, HEAD_R * 1.2), mul(back, HEAD_R * 0.95))))} ${S(a1)} Q${S(add(c, add(mul(h, 0), mul(back, HEAD_R * 1.18))))} ${S(a2)} Q${S(add(c, add(mul(h, -0.2), mul(back, 0.9))))} ${S(a3)} Q${S(add(c, mul(h, HEAD_R * 0.5)))} ${S(a0)}Z`, cloth, []);
    // ear
    sc.path('body', new Seg(add(c, add(mul(back, 0.6), mul(h, 0.4))), add(c, add(mul(back, 0.9), mul(h, -1.1))), 1.0, 0.8).path(), skin, [], { stroke: cloth, strokeOpacity: 0.25, strokeWidth: 0.35 });
    return;
  }
  const neck = new Seg(r.neck, add(r.neck, mul(h, NECK * 0.6)), 2.4, 2.2);
  sc.path('body', neck.path(), skin, neck.pts());
  const up = h;
  const side = perp(h);
  sc.path('body', smooth([add(c, mul(up, 5.6)), add(c, add(mul(side, 4.3), mul(up, 1.2))), add(c, add(mul(side, 3.4), mul(up, -3.4))), add(c, mul(up, -5.3)), add(c, add(mul(side, -3.4), mul(up, -3.4))), add(c, add(mul(side, -4.3), mul(up, 1.2)))]), skin, [add(c, pt(-6, -6)), add(c, pt(6, 6))]);
  for (const s of [-1, 1]) sc.circle('body', add(c, add(mul(side, s * 4.4), mul(up, -0.4))), 1.1, skin);
  if (r.view === 'back') {
    sc.path('body', smooth([add(c, mul(up, 5.9)), add(c, add(mul(side, 4.6), mul(up, 1.6))), add(c, add(mul(side, 4), mul(up, -2.2))), add(c, mul(up, -3)), add(c, add(mul(side, -4), mul(up, -2.2))), add(c, add(mul(side, -4.6), mul(up, 1.6)))]), cloth, []);
  } else {
    sc.path('body', smooth([add(c, mul(up, 6)), add(c, add(mul(side, 4.6), mul(up, 2))), add(c, add(mul(side, 4.2), mul(up, 0.3))), add(c, add(mul(side, 1.5), mul(up, 2.3))), add(c, add(mul(side, -2.5), mul(up, 2.4))), add(c, add(mul(side, -4.2), mul(up, 0.3))), add(c, add(mul(side, -4.6), mul(up, 2)))]), cloth, []);
  }
  void far;
}

type Hi = Set<MuscleRegion>;

/** A soft light catching the front of each limb, for a little volume. */
function sheen(sc: Scene, segs: Seg[], side: number) {
  for (const g of segs) sc.path('body', g.lens(0.12, 0.88, side, 0.55), '#FFFFFF', [], { fillOpacity: sc.pal.sheen });
}

function drawSide(sc: Scene, r: Rig, hi: Hi) {
  const p = sc.pal;
  const arm = (i: 0 | 1) => {
    const skin = i === 0 ? p.skin : p.skinFar;
    const hc = i === 0 ? p.hi : p.hiFar;
    const layer: Layer = i === 0 ? 'body' : 'far';
    const u = r.upper[i];
    const f = r.fore[i];
    sc.path(layer, f.path(), skin, f.pts());
    sc.path(layer, u.path(), skin, u.pts());
    sc.circle(layer, add(r.wrist[i], mul(f.d, 1.4)), 2.05, skin);
    if (i === 0) sheen(sc, [u, f], -1);
    if (hi.has('forearms')) sc.path(layer, f.lens(0.06, 0.72, 0, 0.62), hc, []);
    if (hi.has('biceps')) sc.path(layer, u.lens(0.3, 0.92, -1, 0.85), hc, []);
    if (hi.has('triceps')) sc.path(layer, u.lens(0.18, 0.9, 1, 0.85), hc, []);
    if (hi.has('front-delts')) sc.path(layer, u.lens(-0.2, 0.4, -1, 0.9), hc, []);
    if (hi.has('side-delts')) sc.path(layer, u.lens(-0.22, 0.4, 0, 0.6), hc, []);
    if (hi.has('rear-delts')) sc.path(layer, u.lens(-0.2, 0.4, 1, 0.9), hc, []);
  };
  const leg = (i: 0 | 1) => {
    const skin = i === 0 ? p.skin : p.skinFar;
    const cloth = i === 0 ? p.cloth : p.clothFar;
    const hc = i === 0 ? p.hi : p.hiFar;
    const layer: Layer = i === 0 ? 'body' : 'far';
    const th = r.thigh[i];
    const sh = r.shin[i];
    sc.path(layer, sh.path(), skin, sh.pts());
    sc.path(layer, th.path(), skin, th.pts());
    const shorts = th.part(0, 0.4, 0.15);
    sc.path(layer, shorts.path(), cloth, shorts.pts());
    const fd = unit(sub(r.toe[i], r.ankle[i]));
    const shoe = new Seg(add(r.ankle[i], mul(fd, -1.6)), r.toe[i], 1.9, 1.25, [0, 0], [0.35, 0.2]);
    sc.path(layer, shoe.path(), cloth, shoe.pts());
    if (i === 0) sheen(sc, [th, sh], -1);
    if (hi.has('quads')) sc.path(layer, th.lens(0.14, 0.9, -1, 0.9), hc, []);
    if (hi.has('hamstrings')) sc.path(layer, th.lens(0.2, 0.92, 1, 0.88), hc, []);
    if (hi.has('adductors')) sc.path(layer, th.lens(0.08, 0.62, 0, 0.42), hc, []);
    if (hi.has('calves')) sc.path(layer, sh.lens(0.06, 0.62, 1, 0.9), hc, []);
  };
  arm(1);
  leg(1);
  const t = r.torso;
  const butt = add(add(r.hip, mul(r.n, -1.7)), mul(r.d, 0.6));
  sc.path('body', t.path(), p.skin, t.pts());
  const band = t.part(0, 0.2, 0.25);
  sc.path('body', band.path(), p.cloth, band.pts());
  sc.circle('body', butt, 4.2, p.cloth);
  sheen(sc, [t], 1);
  if (hi.has('glutes')) sc.circle('body', add(butt, mul(r.n, -0.5)), 3.2, p.hi);
  if (hi.has('abductors')) sc.path('body', new Seg(add(butt, mul(r.d, 2.2)), add(butt, mul(r.d, 5.2)), 2.2, 1.6).path(), p.hi, []);
  if (hi.has('abs')) sc.path('body', t.lens(0.3, 0.62, 1, 0.72), p.hi, []);
  if (hi.has('obliques')) sc.path('body', t.lens(0.3, 0.62, 0, 0.36), p.hi, []);
  if (hi.has('chest')) sc.path('body', t.lens(0.6, 0.94, 1, 0.9), p.hi, []);
  if (hi.has('lower-back')) sc.path('body', t.lens(0.28, 0.6, -1, 0.82), p.hi, []);
  if (hi.has('lats')) sc.path('body', t.lens(0.44, 0.86, -1, 0.9), p.hi, []);
  if (hi.has('upper-back')) sc.path('body', t.lens(0.7, 1.02, -1, 0.9), p.hi, []);
  head(sc, r);
  if (hi.has('traps')) sc.path('body', t.lens(0.86, 1.14, -1, 0.95), p.hi, []);
  leg(0);
  arm(0);
}

function drawFront(sc: Scene, r: Rig, hi: Hi) {
  const p = sc.pal;
  const back = r.view === 'back';
  const { hip, d, n } = r;
  const tl = len(sub(r.neck, hip));
  const L = (u: number, v: number) => add(add(hip, mul(n, u)), mul(d, v * (tl / TORSO)));
  const Lr = (u: number, v: number) => L(u, v);
  const T = TORSO;
  const half: [number, number][] = [
    [2.6, T + 0.3], [6.2, T - 0.9], [8.9, T - 2.7], [9.7, T - 5.6], [8.3, T - 9.2], [7.4, T - 13], [6.1, 8.6], [6.6, 3.2], [6.3, -1.4], [3.2, -4.2],
  ];
  const outline = [...half.map(([u, v]) => Lr(u, v)), Lr(0, -4.9), ...half.slice().reverse().map(([u, v]) => Lr(-u, v))];
  const limbs = (i: 0 | 1) => {
    const th = r.thigh[i];
    const sh = r.shin[i];
    sc.path('body', sh.path(), p.skin, sh.pts());
    sc.path('body', th.path(), p.skin, th.pts());
    const shorts = th.part(0, 0.36, 0.35);
    sc.path('body', shorts.path(), p.cloth, shorts.pts());
    const fd = unit(sub(r.toe[i], r.ankle[i]));
    const shoe = new Seg(add(r.ankle[i], mul(fd, -0.4)), r.toe[i], 1.9, 2.1);
    sc.path('body', shoe.path(), p.cloth, shoe.pts());
    if (hi.has('quads') && !back) sc.path('body', th.lens(0.34, 0.92, 0, 0.72), p.hi, []);
    if (hi.has('hamstrings') && back) sc.path('body', th.lens(0.36, 0.92, 0, 0.72), p.hi, []);
    if (hi.has('adductors')) sc.path('body', th.lens(0.3, 0.7, i === 0 ? (back ? -1 : 1) * Math.sign(th.n.x || 1) : -(back ? -1 : 1) * Math.sign(th.n.x || 1), 0.6), p.hi, []);
    if (hi.has('calves')) sc.path('body', sh.lens(0.1, 0.6, back ? 0 : 1, back ? 0.75 : 0.6), p.hi, []);
  };
  const arm = (i: 0 | 1) => {
    const u = r.upper[i];
    const f = r.fore[i];
    sc.path('body', f.path(), p.skin, f.pts());
    sc.path('body', u.path(), p.skin, u.pts());
    sc.circle('body', add(r.wrist[i], mul(f.d, 1.5)), 2.1, p.skin);
    if (hi.has('biceps') && !back) sc.path('body', u.lens(0.34, 0.92, 0, 0.66), p.hi, []);
    if (hi.has('triceps') && back) sc.path('body', u.lens(0.3, 0.92, 0, 0.7), p.hi, []);
    if (hi.has('forearms')) sc.path('body', f.lens(0.06, 0.7, 0, 0.6), p.hi, []);
  };
  if (back) {
    // head sits behind the shoulders when bent over
    head(sc, r);
  }
  limbs(0);
  limbs(1);
  sc.path('body', smooth(outline), p.skin, outline);
  const shortsPts = [Lr(6.6, 3.2), Lr(6.6, -1.4), Lr(3.6, -4.6), Lr(0, -5.2), Lr(-3.6, -4.6), Lr(-6.6, -1.4), Lr(-6.6, 3.2), Lr(0, 3.5)];
  sc.path('body', smooth(shortsPts), p.cloth, shortsPts);
  const both = (pts: [number, number][], color = p.hi) => {
    for (const s of [-1, 1]) sc.path('body', smooth(pts.map(([u, v]) => Lr(s * u, v))), color, []);
  };
  if (!back) {
    if (hi.has('chest')) both([[0.7, T - 3.2], [5.6, T - 3.1], [7.8, T - 6.4], [6.4, T - 9.6], [3.2, T - 10.5], [0.7, T - 9.9]]);
    if (hi.has('abs')) both([[0.5, T - 11.2], [2.6, T - 11.3], [2.9, 9], [2.4, 5], [0.5, 4.6]]);
    if (hi.has('obliques')) both([[3.6, T - 11.6], [6.6, T - 12.6], [5.6, 8.8], [3.7, 6.2]]);
    if (hi.has('traps')) both([[2.4, T - 0.2], [6.3, T - 1.3], [3.4, T - 2.2]]);
    if (hi.has('abductors')) both([[6.2, 3.6], [6.5, -0.8], [5.1, -2.2], [4.8, 2]]);
  } else {
    if (hi.has('traps')) both([[0, T + 0.6], [3, T - 0.1], [7.6, T - 2], [3.8, T - 5.4], [0.4, T - 11.4]]);
    if (hi.has('upper-back')) both([[1.2, T - 6.2], [5.4, T - 3.6], [7.6, T - 7.2], [5.4, T - 10.2], [1.6, T - 9.4]]);
    if (hi.has('lats')) both([[2.2, T - 10.6], [7.7, T - 8.6], [6.9, T - 13.4], [5.3, 8.4], [2.6, 9.6]]);
    if (hi.has('lower-back')) both([[0.5, 12], [2.4, 12.4], [2.8, 4.8], [0.5, 4.2]]);
    if (hi.has('glutes')) both([[0.5, 2.2], [5.8, 2.4], [6.4, -1.2], [3.8, -4.2], [0.5, -4.1]]);
    if (hi.has('abductors')) both([[5, 4.6], [6.6, 3.2], [6.4, 0.6], [4.6, 2.2]]);
    if (hi.has('obliques')) both([[5.4, 11], [6.8, 11.5], [6.2, 6], [5.2, 6.4]]);
  }
  arm(0);
  arm(1);
  // shoulder caps
  for (const i of [0, 1] as const) {
    const c = add(r.shoulder[i], mul(r.d, 0.6));
    sc.circle('body', c, 3.7, p.skin);
    const cap = new Seg(add(c, mul(r.d, 1.2)), add(c, mul(unit(sub(r.elbow[i], r.shoulder[i])), 3.6)), 3.1, 2.2);
    if ((!back && (hi.has('front-delts') || hi.has('side-delts'))) || (back && (hi.has('rear-delts') || hi.has('side-delts')))) sc.path('body', cap.path(), p.hi, []);
  }
  if (!back) head(sc, r);
}

// ---------------------------------------------------------------- archetypes

type Arch = { pose: Pose; gear?: (sc: Scene, r: Rig, floor: number) => void };
type ArchFn = (variant?: string) => Arch;

const hand = (r: Rig, i: 0 | 1 = 0) => add(r.wrist[i], mul(unit(sub(r.wrist[i], r.elbow[i])), 1.4));
const handGear = (sc: Scene, r: Rig, kind: string, angle = -20, both = true) => {
  if (kind === 'dumbbell' || kind === 'hammer') {
    if (both) sc.dumbbell('mid', hand(r, 1), angle);
    sc.dumbbell('front', hand(r, 0), angle);
  } else if (kind === 'kettlebell') {
    if (both) sc.kettlebell('mid', hand(r, 1));
    sc.kettlebell('front', hand(r, 0));
  }
};

const ARCH: Record<string, ArchFn> = {
  bench: (v = 'barbell') => ({
    pose: { hip: [58, 57], torso: 180, head: 186, arm: { to: [38, 33.5], bend: 1 }, arm2: { to: [38.5, 33.5], bend: 1 }, leg: [14, 97], leg2: [9, 100], foot: -10, foot2: -5 },
    gear: (sc, r, floor) => {
      sc.bench(16, 66, 62.4, floor);
      if (v === 'dumbbell') handGear(sc, r, 'dumbbell', 0);
      else sc.barbell(hand(r), 8.4);
    },
  }),
  incline: (v = 'barbell') => ({
    pose: { hip: [60, 60], torso: -140, head: -128, arm: { to: [48, 21], bend: 1 }, arm2: { to: [48.5, 21], bend: 1 }, leg: [4, 94], leg2: [0, 98], foot: 0 },
    gear: (sc, r, floor) => {
      const { pad, metal } = sc.pal;
      const back = mul(r.n, -6.9);
      sc.pad('back', add(add(r.hip, back), mul(r.d, -2)), add(add(r.neck, back), mul(r.d, 3)), 3.4, pad, 1.4);
      sc.pad('back', pt(47, 66.8), pt(68, 66.8), 3.4, pad, 1.4);
      sc.bar('back', pt(56, 68), pt(56, floor), 2.1, metal);
      sc.bar('back', add(add(r.hip, back), mul(r.d, 6)), pt(44, floor), 2.1, metal);
      sc.bar('back', pt(38, floor - 0.6), pt(66, floor - 0.6), 1.4, metal);
      if (v === 'dumbbell') handGear(sc, r, 'dumbbell', 0);
      else sc.barbell(hand(r), 8.4);
    },
  }),
  flyLying: () => ({
    pose: { view: 'front', hip: [64, 50], torso: 180, head: 180, arm: [-100, -118], arm2: [100, 118], leg: [0, 0], leg2: [0, 0], foot: -70, foot2: 70, legScale: [1, 0.95], ground: false },
    gear: (sc, r) => {
      sc.pad('back', pt(22, 50), pt(82, 50), 13, sc.pal.pad, 2.4);
      sc.dumbbell('front', hand(r, 0), 0);
      sc.dumbbell('front', hand(r, 1), 0);
    },
  }),
  cableFly: () => ({
    pose: { view: 'front', hip: [50, 54], torso: -90, arm: [150, 170], arm2: [30, 10], leg: [96, 90], leg2: [84, 90], foot: 100, foot2: 80 },
    gear: (sc, r, floor) => {
      sc.cable(8, floor, 8, pt(12, 12), hand(r, 0), 'd');
      sc.cable(92, floor, 8, pt(88, 12), hand(r, 1), 'd');
    },
  }),
  pecDeck: () => ({
    pose: { view: 'front', hip: [50, 62], torso: -90, arm: [182, -88], arm2: [-2, -92], leg: [110, 90], leg2: [70, 90], legScale: [0.42, 1], foot: 100, foot2: 80 },
    gear: (sc, r, floor) => {
      const { pad, metal } = sc.pal;
      sc.pad('back', pt(50, 64), pt(50, 30), 17, pad, 3);
      sc.pad('back', pt(40, 67), pt(60, 67), 4.4, pad, 1.8);
      sc.bar('back', pt(50, 69), pt(50, floor), 2.4, metal);
      sc.bar('back', pt(38, floor - 0.6), pt(62, floor - 0.6), 1.4, metal);
      for (const i of [0, 1] as const) {
        const a = add(r.elbow[i], pt(0, 2));
        sc.pad('front', a, add(hand(r, i), pt(0, -1)), 4.6, pad, 2);
        sc.line('back', add(hand(r, i), pt(0, -2)), pt(r.elbow[i].x, 12), 1.4, metal);
      }
      sc.bar('back', pt(22, 12), pt(78, 12), 2.2, metal);
    },
  }),
  machinePress: () => ({
    pose: { hip: [42, 64], torso: -96, head: -86, arm: { to: [66, 44], bend: 1 }, arm2: { to: [66.5, 44], bend: 1 }, leg: [0, 88], leg2: [-4, 92] },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      const back = mul(r.n, -6.8);
      sc.pad('back', add(add(r.hip, back), mul(r.d, 1)), add(add(r.neck, back), mul(r.d, 4)), 3.6, pad, 1.5);
      sc.pad('back', pt(30, 70.2), pt(56, 70.2), 3.6, pad, 1.5);
      sc.bar('back', pt(43, 72), pt(43, floor), 2.4, metal);
      sc.bar('back', pt(30, floor - 0.6), pt(58, floor - 0.6), 1.4, metal);
      sc.bar('back', add(add(r.neck, back), mul(r.d, 4)), pt(33, 14), 2.4, metal);
      sc.bar('back', pt(33, 14), pt(60, 14), 2.4, metal);
      const h = hand(r);
      sc.bar('back', pt(60, 14), add(h, pt(-1, -1)), 2, metal);
      sc.bar('front', add(h, pt(0, -3)), add(h, pt(0, 3)), 2, metalDark);
    },
  }),
  pushup: () => ({
    pose: { hip: [37, 71], torso: -21, head: -14, arm: { to: [57, 88.2], bend: -1 }, arm2: { to: [57.5, 88.2], bend: -1 }, leg: [159, 159], leg2: [160, 160], foot: 80 },
  }),
  dip: () => ({
    pose: { hip: [47, 57], torso: -76, head: -80, arm: { to: [49, 50], bend: 1 }, arm2: { to: [49.5, 50], bend: 1 }, leg: [100, 150], leg2: [96, 146], foot: 60, foot2: 60, ground: false },
    gear: (sc, r) => {
      const { metal, metalDark } = sc.pal;
      const y = hand(r).y + 1.2;
      sc.bar('mid', pt(30, y), pt(70, y), 2.4, metalDark);
      sc.bar('back', pt(34, y), pt(34, 96), 2.2, metal);
      sc.bar('back', pt(66, y), pt(66, 96), 2.2, metal);
    },
  }),
  deadlift: () => ({
    pose: { hip: [37, 61], torso: -30, head: -18, arm: { to: [53.5, 76.5], bend: -1 }, arm2: { to: [54, 76.5], bend: -1 }, leg: { to: [50.5, 83.2] }, leg2: { to: [51, 83.2] } },
    gear: (sc, r) => sc.barbell(hand(r), 8.2),
  }),
  rdl: () => ({
    pose: { hip: [36, 52], torso: -20, head: -8, arm: { to: [53, 70], bend: -1 }, arm2: { to: [53.5, 70], bend: -1 }, leg: { to: [50, 88.2] }, leg2: { to: [50.5, 88.2] } },
    gear: (sc, r) => sc.barbell(hand(r), 8.2),
  }),
  clean: () => ({
    pose: { hip: [44, 58], torso: -80, head: -84, arm: [-4, 196], armScale: [1, 0.62], arm2: [-2, 194], arm2Scale: [1, 0.62], leg: { to: [52, 88.4] }, leg2: { to: [52.5, 88.4] } },
    gear: (sc, r) => sc.barbell(add(hand(r), pt(0, -0.6)), 6.8, pt(0.55, -0.6), 8.5),
  }),
  row: (v = 'barbell') => ({
    pose: { hip: [36, 53], torso: -24, head: -12, arm: { to: [50.5, 60], bend: -1 }, arm2: { to: [51, 60], bend: -1 }, leg: { to: [50, 88.2] }, leg2: { to: [50.5, 88.2] } },
    gear: (sc, r, floor) => {
      const h = hand(r);
      if (v === 'tbar') {
        const { metal, plate, plateRim } = sc.pal;
        const pivot = pt(14, floor - 1.5);
        const end = add(h, mul(unit(sub(h, pivot)), 5));
        sc.line('mid', pivot, end, 1.8, metal);
        sc.circle('mid', add(end, pt(-0.5, 0.4)), 7.2, plateRim);
        sc.circle('mid', end, 7.2, plate);
        sc.circle('mid', end, 5.2, 'none', { stroke: plateRim, strokeWidth: 0.6 });
        sc.bar('front', add(h, pt(-2, 0)), add(h, pt(2, 0)), 1.8, sc.pal.metalDark);
        sc.circle('back', pivot, 2, metal);
      } else if (v === 'dumbbell') handGear(sc, r, 'dumbbell');
      else sc.barbell(h, 8.2);
    },
  }),
  dbRow: () => ({
    pose: { hip: [36, 52], torso: -6, head: 4, arm: { to: [42, 60], bend: -1 }, arm2: { to: [62, 69], bend: -1 }, leg: { to: [28, 86.2] }, leg2: [90, 180], foot2: 172 },
    gear: (sc, r, floor) => {
      sc.bench(12, 70, 71.4, floor);
      sc.dumbbell('front', hand(r), -10);
    },
  }),
  pullup: (v) => ({
    pose: { hip: [49, 54], torso: -95, head: -88, arm: { to: [53, 13], bend: -1 }, arm2: { to: [53.5, 13], bend: -1 }, leg: [98, 132], leg2: [94, 128], foot: 70, foot2: 70, ground: false },
    gear: (sc, r) => {
      const { metal, metalDark } = sc.pal;
      const y = hand(r).y - 0.2;
      sc.bar('front', pt(36, y), pt(72, y), 2.2, metalDark);
      sc.bar('back', pt(38, y), pt(38, 2), 2, metal);
      sc.bar('back', pt(70, y), pt(70, 2), 2, metal);
      void v;
    },
  }),
  legRaise: () => ({
    pose: { hip: [49, 60], torso: -90, arm: { to: [50, 13] }, arm2: { to: [50.5, 13] }, leg: [-2, -2], leg2: [2, 2], foot: -70, foot2: -60, ground: false },
    gear: (sc, r) => {
      const { metal, metalDark } = sc.pal;
      const y = hand(r).y - 0.2;
      sc.bar('front', pt(33, y), pt(67, y), 2.2, metalDark);
      sc.bar('back', pt(35, y), pt(35, 2), 2, metal);
      sc.bar('back', pt(65, y), pt(65, 2), 2, metal);
    },
  }),
  pulldown: () => ({
    pose: { hip: [40, 66], torso: -100, head: -92, arm: { to: [45, 30], bend: -1 }, arm2: { to: [45.5, 30], bend: -1 }, leg: [-2, 92], leg2: [2, 96] },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      const h = hand(r);
      sc.pad('back', pt(26, 72.4), pt(52, 72.4), 3.6, pad, 1.5);
      sc.bar('back', pt(40, 74), pt(40, floor), 2.4, metal);
      sc.bar('back', pt(26, floor - 0.6), pt(80, floor - 0.6), 1.4, metal);
      sc.pad('front', add(r.knee[0], pt(-4, -5.6)), add(r.knee[0], pt(3, -5.6)), 3.8, pad, 1.9);
      sc.bar('back', add(r.knee[0], pt(2, -5)), pt(74, 60), 1.8, metal);
      sc.cable(78, floor, 4, pt(h.x, 4), h, 'none');
      sc.bar('front', add(h, pt(-7, 1.4)), add(h, pt(7, 1.4)), 1.7, metalDark);
    },
  }),
  seatedRow: () => ({
    pose: { hip: [26, 70], torso: -92, head: -88, arm: { to: [41, 63], bend: 1 }, arm2: { to: [41.5, 63], bend: 1 }, leg: [-14, 12], leg2: [-12, 14], foot: -78, foot2: -76 },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      sc.pad('back', pt(10, 76.4), pt(40, 76.4), 3.6, pad, 1.5);
      sc.bar('back', pt(24, 78), pt(24, floor), 2.2, metal);
      sc.bar('back', pt(8, floor - 0.6), pt(92, floor - 0.6), 1.6, metal);
      const f = r.toe[0];
      sc.pad('back', pt(f.x + 1.6, f.y - 6), pt(f.x + 2.2, f.y + 9), 2.4, metalDark, 1);
      sc.bar('back', pt(f.x + 2, f.y + 8), pt(f.x + 2, floor), 1.8, metal);
      const h = hand(r);
      sc.cable(90, floor, 30, pt(86, h.y + 1), h, 'none');
      sc.bar('front', add(h, pt(0.5, -2.2)), add(h, pt(-0.5, 2.2)), 1.8, metalDark);
    },
  }),
  facePull: () => ({
    pose: { hip: [36, 51], torso: -94, head: -92, arm: { to: [49, 23.5], bend: -1 }, arm2: { to: [49.5, 23.5], bend: -1 }, leg: [80, 96], leg2: [100, 88] },
    gear: (sc, r, floor) => sc.cable(88, floor, 12, pt(84, 22), hand(r), 'rope', -160),
  }),
  backExt: () => ({
    pose: { hip: [46, 64], torso: -34, head: -32, arm: { to: [56, 62], bend: 1 }, arm2: { to: [56.5, 62], bend: 1 }, leg: [146, 146], leg2: [147, 147], foot: 100 },
    gear: (sc, r, floor) => {
      const { pad, metal } = sc.pal;
      const n = r.n;
      const a = add(add(r.hip, mul(n, 7.6)), mul(r.d, -1));
      const b = add(a, mul(r.d, 7));
      sc.pad('back', a, b, 3.6, pad, 1.5);
      const an = r.ankle[0];
      sc.circle('mid', add(an, pt(1.4, -3.4)), 2.4, pad);
      sc.bar('back', add(an, pt(2, 3.6)), pt(66, floor - 12), 2.2, metal);
      sc.bar('back', pt(66, floor - 12), add(a, mul(r.d, 3)), 2.2, metal);
      sc.bar('back', add(an, pt(3, 4)), pt(an.x + 3, floor), 2, metal);
      sc.bar('back', pt(62, floor - 12), pt(62, floor), 2, metal);
      sc.bar('back', pt(an.x - 2, floor - 0.6), pt(66, floor - 0.6), 1.4, metal);
    },
  }),
  ohp: (v = 'barbell') => ({
    pose: { hip: [48, 54], torso: -90, head: -90, arm: { to: [49, 9.5], bend: -1 }, arm2: { to: [49.5, 9.5], bend: -1 }, leg: [91, 90], leg2: [89, 90] },
    gear: (sc, r) => {
      if (v === 'barbell') sc.barbell(hand(r), 8.2);
      else handGear(sc, r, v, -20);
    },
  }),
  seatedPress: (v = 'dumbbell') => ({
    pose: v === 'arnold'
      ? { hip: [42, 62], torso: -90, arm: { to: [50, 29], bend: -1 }, arm2: { to: [50.5, 29], bend: -1 }, leg: [-2, 90], leg2: [2, 92] }
      : { hip: [42, 62], torso: -90, arm: { to: [45, 18], bend: -1 }, arm2: { to: [45.5, 18], bend: -1 }, leg: [-2, 90], leg2: [2, 92] },
    gear: (sc, r, floor) => {
      const { pad, metal } = sc.pal;
      sc.pad('back', pt(35.6, 68), pt(35.6, 34), 3.6, pad, 1.5);
      sc.pad('back', pt(28, 68.2), pt(52, 68.2), 3.6, pad, 1.5);
      sc.bar('back', pt(40, 70), pt(40, floor), 2.2, metal);
      sc.bar('back', pt(28, floor - 0.6), pt(52, floor - 0.6), 1.4, metal);
      handGear(sc, r, 'dumbbell', v === 'arnold' ? -80 : -12);
    },
  }),
  raise: (v = 'dumbbell') => ({
    pose: v === 'cable'
      ? { view: 'front', hip: [46, 52], torso: -90, arm: [186, 176], arm2: [100, 80], leg: [96, 90], leg2: [84, 90], foot: 100, foot2: 80 }
      : { view: 'front', hip: [50, 52], torso: -90, arm: [184, 178], arm2: [-4, 2], leg: [95, 90], leg2: [85, 90], foot: 100, foot2: 80 },
    gear: (sc, r, floor) => {
      if (v === 'cable') sc.cable(88, floor, 30, pt(86, floor - 6), hand(r, 0), 'd');
      else {
        sc.dumbbell('front', hand(r, 0), -90, 0.9);
        sc.dumbbell('front', hand(r, 1), -90, 0.9);
      }
    },
  }),
  rearFly: () => ({
    pose: { view: 'back', hip: [50, 50], torso: -90, torsoScale: 0.62, head: -90, arm: [182, 176], arm2: [-2, 4], leg: [96, 90], leg2: [84, 90], foot: 100, foot2: 80 },
    gear: (sc, r) => {
      sc.dumbbell('front', hand(r, 0), -90, 0.9);
      sc.dumbbell('front', hand(r, 1), -90, 0.9);
    },
  }),
  uprightRow: () => ({
    pose: { view: 'front', hip: [50, 54], torso: -90, arm: { to: [46, 40], bend: 1 }, arm2: { to: [54, 40], bend: -1 }, leg: [95, 90], leg2: [85, 90], foot: 100, foot2: 80 },
    gear: (sc, r) => sc.barbellFront(pt(50, hand(r).y), 24, 7.6),
  }),
  shrug: () => ({
    pose: { view: 'front', hip: [50, 54], torso: -90, arm: [100, 92], arm2: [80, 88], leg: [95, 90], leg2: [85, 90], foot: 100, foot2: 80 },
    gear: (sc, r) => {
      sc.dumbbell('front', hand(r, 0), -90, 1);
      sc.dumbbell('front', hand(r, 1), -90, 1);
    },
  }),
  abduction: () => ({
    pose: { view: 'front', hip: [50, 60], torso: -90, arm: [104, 80], arm2: [76, 100], leg: [150, 94], leg2: [30, 86], legScale: [0.62, 1], foot: 100, foot2: 80 },
    gear: (sc, r, floor) => {
      const { pad, metal } = sc.pal;
      sc.pad('back', pt(50, 62), pt(50, 30), 17, pad, 3);
      sc.pad('back', pt(36, 64.6), pt(64, 64.6), 4.4, pad, 1.8);
      sc.bar('back', pt(50, 66), pt(50, floor), 2.4, metal);
      sc.bar('back', pt(30, floor - 0.6), pt(70, floor - 0.6), 1.4, metal);
      for (const i of [0, 1] as const) {
        const s = i === 0 ? -1 : 1;
        sc.pad('front', add(r.knee[i], pt(s * 4.2, -5)), add(r.knee[i], pt(s * 4.2, 4)), 3.4, pad, 1.7);
      }
    },
  }),
  curl: (v = 'barbell') => ({
    pose: { hip: [46, 51], torso: -90, arm: [94, -48], arm2: [92, -50], leg: [91, 90], leg2: [89, 90] },
    gear: (sc, r, floor) => {
      if (v === 'barbell') sc.barbell(hand(r), 7);
      else if (v === 'cable') {
        sc.cable(84, floor, 40, pt(80, floor - 6), hand(r), 'bar', 90);
      } else handGear(sc, r, v, v === 'hammer' ? -88 : -18);
    },
  }),
  preacher: () => ({
    pose: { hip: [36, 62], torso: -80, head: -80, arm: [42, -62], arm2: [44, -60], leg: [0, 92], leg2: [4, 94] },
    gear: (sc, r, floor) => {
      const { pad, metal } = sc.pal;
      const u = r.upper[0];
      sc.pad('back', u.at(0.1, -3.6), u.at(1.05, -3.6), 3.4, pad, 1.5);
      sc.bar('back', u.at(0.6, -6), pt(u.at(0.6, -6).x, floor), 2.2, metal);
      sc.pad('back', pt(24, 68.2), pt(46, 68.2), 3.6, pad, 1.5);
      sc.bar('back', pt(34, 70), pt(34, floor), 2.2, metal);
      sc.bar('back', pt(24, floor - 0.6), pt(64, floor - 0.6), 1.4, metal);
      sc.barbell(hand(r), 6.4);
    },
  }),
  pushdown: () => ({
    pose: { hip: [40, 51], torso: -84, head: -84, arm: [96, 42], arm2: [94, 40], leg: [93, 90], leg2: [85, 92] },
    gear: (sc, r, floor) => sc.cable(78, floor, 6, pt(74, 10), hand(r), 'bar', 20),
  }),
  overheadExt: () => ({
    pose: { hip: [48, 53], torso: -90, head: -84, arm: [-98, 118], arm2: [-100, 116], leg: [91, 90], leg2: [89, 90] },
    gear: (sc, r) => sc.dumbbell('mid', add(hand(r), pt(-0.5, 0.6)), -80, 1.05),
  }),
  skullCrusher: () => ({
    pose: { hip: [58, 57], torso: 180, head: 186, arm: [-104, 150], arm2: [-102, 152], leg: [14, 97], leg2: [9, 100], foot: -10, foot2: -5 },
    gear: (sc, r, floor) => {
      sc.bench(16, 66, 62.4, floor);
      sc.barbell(hand(r), 6.6);
    },
  }),
  squat: (v = 'back') => {
    const front = v === 'front' || v === 'goblet';
    return {
      pose: {
        hip: front ? [40, 64] : [38, 65],
        torso: front ? -68 : -54,
        head: front ? -80 : -64,
        arm: v === 'front' ? [-8, 194] : v === 'goblet' ? { to: [55, 44], bend: 1 } : { to: [47.2, 45.4], bend: 1 },
        armScale: v === 'front' ? [1, 0.6] : v === 'goblet' ? [1, 0.9] : undefined,
        leg: { to: [52.5, 86.4] },
        leg2: { to: [53, 86.4] },
      },
      gear: (sc, r) => {
        if (v === 'goblet') sc.dumbbell('front', add(hand(r), pt(1, -1.5)), -84, 1.05);
        else if (v === 'front') sc.barbell(add(hand(r), pt(0, -0.6)), 6.8, pt(0.55, -0.6), 8.5);
        else sc.barbell(add(r.neck, add(mul(r.n, -4.4), mul(r.d, -2.6))), 7.6, pt(0.66, -0.48), 8);
      },
    };
  },
  hackSquat: () => ({
    pose: { hip: [36, 63], torso: -58, head: -66, arm: { to: [44, 36], bend: -1 }, leg: { to: [55, 80] }, leg2: { to: [55.5, 80] }, foot: -24 },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      const back = mul(r.n, -6.6);
      const a = add(add(r.hip, back), mul(r.d, -2));
      const b = add(add(r.neck, back), mul(r.d, 2));
      sc.pad('back', a, b, 3.6, pad, 1.5);
      sc.pad('back', add(b, mul(r.n, 1.6)), add(add(b, mul(r.n, 7)), mul(r.d, -1.2)), 3.4, pad, 1.6);
      sc.bar('back', add(add(a, mul(r.n, -2.4)), mul(r.d, 4)), pt(add(a, mul(r.n, -2.4)).x - 4, floor), 2.2, metal);
      const f = r.toe[0];
      const fd = unit(sub(r.toe[0], r.ankle[0]));
      const plat = add(add(r.ankle[0], mul(fd, 2.4)), mul(perp(fd), 2.6));
      sc.pad('back', add(plat, mul(fd, -6)), add(plat, mul(fd, 7)), 2.4, metalDark, 1);
      sc.bar('back', add(plat, mul(fd, 6)), pt(f.x + 6, floor), 2.2, metal);
      sc.bar('back', pt(14, floor - 0.6), pt(f.x + 10, floor - 0.6), 1.4, metal);
    },
  }),
  legPress: () => ({
    pose: { hip: [36, 70], torso: -152, head: -140, arm: { to: [44, 74], bend: 1 }, leg: { to: [62, 46.5], bend: -1 }, leg2: { to: [62.5, 46.5], bend: -1 }, foot: -134, foot2: -134, ground: 90 },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark, plate } = sc.pal;
      const back = mul(r.n, -6.6);
      sc.pad('back', add(add(r.hip, back), mul(r.d, -2)), add(add(r.neck, back), mul(r.d, 5)), 3.6, pad, 1.5);
      sc.pad('back', pt(28, 76.4), pt(46, 76.4), 3.6, pad, 1.5);
      const a = r.ankle[0];
      const fd = unit(sub(r.toe[0], a));
      let nrm = perp(fd);
      if (nrm.x * (r.knee[0].x - a.x) + nrm.y * (r.knee[0].y - a.y) > 0) nrm = mul(nrm, -1);
      const plat = add(lerpP(a, r.toe[0], 0.35), mul(nrm, 2.4));
      sc.pad('mid', add(plat, mul(fd, -6)), add(plat, mul(fd, 9)), 2.4, metalDark, 1.1);
      const horn = add(plat, mul(nrm, 7));
      sc.bar('back', plat, horn, 2.6, metal);
      sc.circle('back', horn, 5.6, plate);
      sc.circle('back', horn, 1.3, metal);
      const rail0 = add(horn, mul(nrm, -30));
      sc.bar('back', add(rail0, mul(perp(nrm), -5)), add(add(horn, mul(nrm, 6)), mul(perp(nrm), -5)), 1.8, metal);
      sc.bar('back', pt(37, 78), pt(37, floor), 2.2, metal);
      sc.bar('back', add(add(horn, mul(nrm, 5)), mul(perp(nrm), -5)), pt(add(horn, mul(nrm, 5)).x, floor), 2, metal);
      sc.bar('back', pt(22, floor - 0.6), pt(add(horn, mul(nrm, 5)).x + 4, floor - 0.6), 1.6, metal);
    },
  }),
  splitSquat: () => ({
    pose: { hip: [44, 62], torso: -86, arm: [94, 92], arm2: [90, 90], leg: { to: [60.5, 84.4] }, leg2: { to: [25, 64.6], bend: -1 }, foot2: 176 },
    gear: (sc, r, floor) => {
      sc.bench(6, 30, 66.4, floor);
      handGear(sc, r, 'dumbbell', -14);
    },
  }),
  lunge: () => ({
    pose: { hip: [44, 62], torso: -88, arm: [92, 90], arm2: [88, 88], leg: { to: [61, 84.4] }, leg2: { to: [22.5, 82.5], bend: -1 }, foot2: 96 },
    gear: (sc, r) => handGear(sc, r, 'dumbbell', -14),
  }),
  legExt: () => ({
    pose: { hip: [36, 62], torso: -97, head: -90, arm: { to: [42, 70], bend: 1 }, leg: [0, 8], leg2: [2, 10], foot: -70, foot2: -68 },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      const back = mul(r.n, -6.8);
      sc.pad('back', add(add(r.hip, back), mul(r.d, 1)), add(add(r.neck, back), mul(r.d, 3)), 3.6, pad, 1.5);
      sc.pad('back', pt(24, 68.2), pt(58, 68.2), 3.6, pad, 1.5);
      sc.bar('back', pt(40, 70), pt(40, floor), 2.4, metal);
      sc.bar('back', pt(24, floor - 0.6), pt(62, floor - 0.6), 1.4, metal);
      const sh = r.shin[0];
      const roller = sh.at(0.9, -4.6);
      sc.bar('mid', r.knee[0], sh.at(0.9, -2), 1.8, metalDark);
      sc.circle('front', roller, 2.6, pad);
      sc.bar('back', pt(58, 70), pt(58, floor), 2.2, metal);
    },
  }),
  legCurl: () => ({
    pose: { hip: [44, 58], torso: -2, head: -16, arm: [100, 8], arm2: [98, 10], leg: [180, -68], leg2: [178, -72], foot: -150, foot2: -150 },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      sc.pad('back', pt(14, 64.4), pt(62, 64.4), 3.8, pad, 1.6);
      sc.pad('back', pt(30, 62.8), pt(48, 62.8), 3, pad, 1.5);
      const sh = r.shin[0];
      const roller = sh.at(0.85, 4.6);
      sc.circle('front', roller, 2.7, pad);
      sc.bar('back', r.knee[0], sh.at(0.85, 2), 1.8, metalDark);
      sc.bar('back', pt(22, 66), pt(22, floor), 2.2, metal);
      sc.bar('back', pt(56, 66), pt(56, floor), 2.2, metal);
      sc.bar('back', pt(14, floor - 0.6), pt(66, floor - 0.6), 1.4, metal);
      sc.bar('back', pt(66, 66), pt(66, 74), 1.6, metal);
    },
  }),
  calfRaise: () => ({
    pose: { hip: [48, 47.5], torso: -90, arm: { to: [52, 28.5], bend: 1 }, arm2: { to: [52.5, 28.5], bend: 1 }, leg: [91, 90], leg2: [89, 90], foot: 52 },
    gear: (sc, r, floor) => {
      const { pad, metal, metalDark } = sc.pal;
      const t = r.toe[0];
      sc.pad('back', pt(t.x - 3, t.y + 3.4), pt(t.x + 12, t.y + 3.4), 6.2, metalDark, 1.2);
      sc.bar('back', pt(t.x + 10, t.y + 3), pt(t.x + 10, floor), 2, metal);
      const top = add(r.neck, pt(1, -1));
      sc.pad('front', add(top, pt(-4, -0.5)), add(top, pt(5, -0.5)), 3.8, pad, 1.8);
      sc.bar('back', add(top, pt(-3, -1)), pt(30, top.y - 1), 2.2, metal);
      sc.bar('back', pt(30, top.y - 6), pt(30, floor), 2.6, metal);
      sc.bar('back', pt(24, floor - 0.6), pt(t.x + 12, floor - 0.6), 1.4, metal);
    },
  }),
  hipThrust: () => ({
    pose: { hip: [56, 55.6], torso: 181, head: 196, arm: { to: [55, 47.5], bend: -1 }, leg: [-8, 94], leg2: [-5, 96] },
    gear: (sc, r, floor) => {
      sc.bench(12, 40, 58.8, floor);
      sc.barbell(add(r.hip, pt(0, -8.8)), 8.4);
    },
  }),
  bridge: () => ({
    pose: { hip: [48, 71.6], torso: 160, head: 176, arm: [8, 2], leg: [-20, 94], leg2: [-17, 96] },
  }),
  kickback: () => ({
    pose: { hip: [40, 51], torso: -74, head: -80, arm: { to: [69, 42] }, arm2: { to: [69.5, 42] }, leg: [128, 118], leg2: [91, 90], foot: 60 },
    gear: (sc, r, floor) => sc.cable(76, floor, 20, pt(74, floor - 5), r.ankle[0], 'none'),
  }),
  plank: () => ({
    pose: { hip: [38, 70], torso: -10, head: -4, arm: [96, 2], arm2: [95, 3], leg: [168, 168], leg2: [169, 169], foot: 70 },
  }),
  crunch: () => ({
    pose: { hip: [58, 76.8], torso: -148, head: -140, arm: { to: [26, 60], bend: -1 }, leg: [-52, 104], leg2: [-48, 106] },
  }),
  cableCrunch: () => ({
    pose: { hip: [36, 62], torso: -12, head: 40, arm: { to: [59, 59], bend: 1 }, arm2: { to: [59.5, 59], bend: 1 }, leg: [90, 180], leg2: [92, 180], foot: 170, foot2: 170 },
    gear: (sc, r, floor) => sc.cable(84, floor, 4, pt(78, 8), hand(r), 'rope', -90),
  }),
  twist: () => ({
    pose: { hip: [42, 75], torso: -118, head: -104, arm: { to: [60, 61], bend: 1 }, arm2: { to: [60.5, 60.4], bend: 1 }, leg: [-40, 22], leg2: [-36, 26], foot: -10 },
    gear: (sc, r) => sc.circle('front', add(hand(r), pt(1.6, 0)), 3.4, sc.pal.plate),
  }),
  abWheel: () => ({
    pose: { hip: [44, 72], torso: -13, head: -6, arm: { to: [81, 79.6], bend: 1 }, arm2: { to: [81.5, 79.6], bend: 1 }, leg: [152, 180], leg2: [150, 180], foot: 172 },
    gear: (sc, r) => {
      const h = hand(r);
      const { plate, metal } = sc.pal;
      const c = pt(h.x + 0.6, h.y + 1.6);
      sc.circle('front', c, 4, plate);
      sc.circle('front', c, 1.3, metal);
    },
  }),
  swing: () => ({
    pose: { hip: [42, 51], torso: -93, arm: [-8, -6], arm2: [-6, -4], leg: [91, 90], leg2: [88, 92] },
    gear: (sc, r) => {
      sc.kettlebell('front', hand(r), dir(-6));
    },
  }),
  burpee: () => ({
    pose: { hip: [50, 46], torso: -90, arm: [-104, -96], arm2: [-100, -92], leg: [84, 110], leg2: [96, 116], foot: 70, foot2: 72, ground: 92 },
  }),
  carry: () => ({
    pose: { hip: [48, 51], torso: -90, arm: [92, 90], arm2: [88, 88], leg: [74, 98], leg2: [106, 94], foot: 0, foot2: 20 },
    gear: (sc, r) => {
      sc.dumbbell('mid', hand(r, 1), 0, 1.05);
      sc.dumbbell('front', hand(r, 0), 0, 1.05);
    },
  }),
  run: () => ({
    pose: { hip: [48, 51], torso: -80, head: -84, arm: [120, -30], arm2: [60, 160], leg: [60, 110], leg2: [120, 160], foot: 10, foot2: 60 },
  }),
};

// ---------------------------------------------------------------- which figure for which exercise

const LIBRARY_ART: Record<string, [string, string?]> = {
  'bench-press': ['bench'], 'incline-bench': ['incline'], 'db-bench': ['bench', 'dumbbell'], 'incline-db-press': ['incline', 'dumbbell'],
  'db-fly': ['flyLying'], 'cable-fly': ['cableFly'], 'chest-press': ['machinePress'], 'pec-deck': ['pecDeck'], 'push-up': ['pushup'], dip: ['dip'],
  deadlift: ['deadlift'], 'barbell-row': ['row'], 'db-row': ['dbRow'], 'pull-up': ['pullup'], 'chin-up': ['pullup', 'chin'],
  'lat-pulldown': ['pulldown'], 'seated-row': ['seatedRow'], 't-bar-row': ['row', 'tbar'], 'face-pull': ['facePull'], 'back-extension': ['backExt'],
  ohp: ['ohp'], 'db-shoulder-press': ['seatedPress'], 'lateral-raise': ['raise'], 'cable-lateral': ['raise', 'cable'], 'rear-delt-fly': ['rearFly'],
  'arnold-press': ['seatedPress', 'arnold'], 'upright-row': ['uprightRow'], shrug: ['shrug'],
  'barbell-curl': ['curl'], 'db-curl': ['curl', 'dumbbell'], 'hammer-curl': ['curl', 'hammer'], 'preacher-curl': ['preacher'], 'cable-curl': ['curl', 'cable'],
  'tricep-pushdown': ['pushdown'], 'overhead-extension': ['overheadExt'], 'skull-crusher': ['skullCrusher'], 'close-grip-bench': ['bench'],
  squat: ['squat'], 'front-squat': ['squat', 'front'], 'leg-press': ['legPress'], 'hack-squat': ['hackSquat'], 'goblet-squat': ['squat', 'goblet'],
  'bulgarian-split-squat': ['splitSquat'], lunge: ['lunge'], 'leg-extension': ['legExt'], 'leg-curl': ['legCurl'], rdl: ['rdl'], 'calf-raise': ['calfRaise'],
  'hip-thrust': ['hipThrust'], 'glute-bridge': ['bridge'], 'cable-kickback': ['kickback'], 'hip-abduction': ['abduction'],
  plank: ['plank'], crunch: ['crunch'], 'hanging-leg-raise': ['legRaise'], 'cable-crunch': ['cableCrunch'], 'russian-twist': ['twist'], 'ab-wheel': ['abWheel'],
  'kb-swing': ['swing'], clean: ['clean'], burpee: ['burpee'], 'farmer-carry': ['carry'],
};

/** Archetypes that can swap their equipment for a custom exercise's. */
const VARIANTS: Record<string, Partial<Record<Equipment, string>>> = {
  bench: { barbell: 'barbell', dumbbell: 'dumbbell', kettlebell: 'dumbbell' },
  incline: { barbell: 'barbell', dumbbell: 'dumbbell' },
  ohp: { barbell: 'barbell', dumbbell: 'dumbbell', kettlebell: 'kettlebell' },
  curl: { barbell: 'barbell', dumbbell: 'dumbbell', cable: 'cable', band: 'cable', kettlebell: 'dumbbell' },
  raise: { dumbbell: 'dumbbell', cable: 'cable', band: 'cable' },
  row: { barbell: 'barbell', dumbbell: 'dumbbell', machine: 'tbar' },
};

const GROUP_ART: Record<Muscle, Partial<Record<Equipment | 'any', [string, string?]>>> = {
  chest: { machine: ['machinePress'], cable: ['cableFly'], band: ['cableFly'], bodyweight: ['pushup'], dumbbell: ['bench', 'dumbbell'], any: ['bench'] },
  back: { cable: ['seatedRow'], machine: ['pulldown'], bodyweight: ['pullup'], dumbbell: ['dbRow'], any: ['row'] },
  shoulders: { dumbbell: ['seatedPress'], cable: ['raise', 'cable'], band: ['raise', 'cable'], machine: ['seatedPress'], any: ['ohp'] },
  arms: { cable: ['pushdown'], band: ['pushdown'], dumbbell: ['curl', 'dumbbell'], machine: ['preacher'], any: ['curl'] },
  legs: { machine: ['legPress'], dumbbell: ['lunge'], bodyweight: ['lunge'], any: ['squat'] },
  glutes: { cable: ['kickback'], band: ['kickback'], bodyweight: ['bridge'], machine: ['abduction'], any: ['hipThrust'] },
  core: { cable: ['cableCrunch'], any: ['crunch'] },
  cardio: { any: ['run'] },
  full: { kettlebell: ['swing'], bodyweight: ['burpee'], dumbbell: ['carry'], any: ['clean'] },
};

export function figureFor(exerciseId: string, customExercises: Exercise[] = []): [string, string?] {
  const lib = LIBRARY_ART[exerciseId];
  if (lib) return lib;
  const ex = findExercise(exerciseId, customExercises);
  if (!ex) return ['stand'];
  const match = libraryMatch(ex);
  if (match && LIBRARY_ART[match]) {
    const [arch, v] = LIBRARY_ART[match];
    const swap = VARIANTS[arch]?.[ex.equipment];
    return [arch, swap ?? v];
  }
  const g = GROUP_ART[ex.muscle] ?? GROUP_ART.full;
  return g[ex.equipment] ?? g.any ?? ['stand'];
}

ARCH.stand = () => ({ pose: { hip: [48, 51], torso: -90, arm: [94, 92], arm2: [88, 90], leg: [91, 90], leg2: [89, 90] } });

// ---------------------------------------------------------------- component

function palette(colors: Colors, dark: boolean): Pal {
  const tile = dark ? mix(colors.cardAlt, colors.card, 0.8) : mix(colors.cardAlt, colors.card, 0.75);
  const accent = muscleAccent(colors);
  const skin = dark ? mix(colors.text, tile, 0.62) : mix(colors.text, tile, 0.5);
  const cloth = dark ? mix(colors.text, tile, 0.88) : mix(colors.text, tile, 0.78);
  return {
    skin,
    skinFar: mix(skin, tile, dark ? 0.62 : 0.6),
    cloth,
    clothFar: mix(cloth, tile, dark ? 0.55 : 0.52),
    hi: accent,
    hiFar: mix(accent, tile, 0.55),
    metal: mix(colors.text, tile, dark ? 0.3 : 0.26),
    metalDark: mix(colors.text, tile, dark ? 0.5 : 0.55),
    plate: mix(colors.text, tile, dark ? 0.42 : 0.72),
    plateRim: mix(colors.text, tile, dark ? 0.62 : 0.45),
    pad: mix(colors.text, tile, dark ? 0.24 : 0.36),
    cable: mix(colors.text, tile, dark ? 0.4 : 0.42),
    shadow: colors.text,
    tileTop: dark ? mix(colors.cardAlt, '#FFFFFF', 0.94) : mix(colors.card, colors.cardAlt, 0.4),
    tileBottom: tile,
    sheen: dark ? 0.07 : 0.13,
  };
}

function compose(exerciseId: string, customExercises: Exercise[], pal: Pal) {
  const [arch, variant] = figureFor(exerciseId, customExercises);
  const a = (ARCH[arch] ?? ARCH.stand)(variant);
  const pose = a.pose;
  const rig = buildRig(pose);
  const hi = new Set(exerciseInfo(exerciseId, customExercises).primary);
  const sc = new Scene(pal);
  if (rig.view === 'side') drawSide(sc, rig, hi);
  else drawFront(sc, rig, hi);
  const bodyPts = sc.pts.slice();
  const lowest = Math.max(...bodyPts.map((q) => q.y)) - 1.2;
  const floor = typeof pose.ground === 'number' ? pose.ground : lowest;
  a.gear?.(sc, rig, floor);
  const xs = sc.pts.map((q) => q.x);
  const ys = sc.pts.map((q) => q.y);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  const showGround = pose.ground !== false;
  if (showGround) y1 = Math.max(y1, floor + 1.5);
  const w = x1 - x0;
  const h = y1 - y0;
  const scale = Math.min(86 / w, 86 / h, 1.3);
  const tx = 50 - ((x0 + x1) / 2) * scale;
  const ty = 50 - ((y0 + y1) / 2) * scale;
  return { sc, floor, showGround, x0, x1, scale, tx, ty, flip: !!pose.flip };
}

/** A drawn person doing the exercise (with its equipment), sized as a square. */
export function ExerciseFigure({ exerciseId, size = 56, customExercises = [], style }: { exerciseId: string; size?: number; customExercises?: Exercise[]; style?: StyleProp<ViewStyle> }) {
  const { colors, dark } = useTheme();
  const pal = useMemo(() => palette(colors, dark), [colors, dark]);
  const gid = `fig-${exerciseId.replace(/[^a-zA-Z0-9]/g, '')}-${dark ? 'd' : 'l'}`;
  const { sc, floor, showGround, x0, x1, scale, tx, ty, flip } = useMemo(() => compose(exerciseId, customExercises, pal), [exerciseId, customExercises, pal]);
  const radius = size * 0.26;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]} accessibilityRole="image" accessibilityLabel={findExercise(exerciseId, customExercises)?.name ?? 'Exercise'}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pal.tileTop} />
            <Stop offset="1" stopColor={pal.tileBottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${gid})`} />
        <G transform={`translate(${n2(flip ? 100 - tx : tx)} ${n2(ty)}) scale(${n2(flip ? -scale : scale)} ${n2(scale)})`}>
          {showGround && <Ellipse cx={(x0 + x1) / 2} cy={floor + 0.8} rx={(x1 - x0) * 0.46} ry={1.6} fill={pal.shadow} fillOpacity={dark ? 0.28 : 0.07} />}
          {sc.back}
          {sc.far}
          {sc.mid}
          {sc.body}
          {sc.front}
        </G>
      </Svg>
    </View>
  );
}
