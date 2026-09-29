import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type PanResponderInstance,
  type ScrollView,
  type ViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { nativeDriver } from './motion';
import { useTheme } from '@/theme';

/*
 * Drag to reorder, built on PanResponder + Animated (no gesture libraries).
 * Press a row's handle and drag: the row lifts, the others slide out of the
 * way, and dropping reorders. Inside a ScrollView, wire the scroll view with
 * useDragScroll() so it stops scrolling while you drag and scrolls itself
 * when you drag near its top or bottom edge.
 */

/** The link between a DragList and the ScrollView it lives in. */
export interface DragScroll {
  ref: React.RefObject<ScrollView | null>;
  y: React.MutableRefObject<number>;
  size: React.MutableRefObject<{ content: number; view: number }>;
  lock: (on: boolean) => void;
}

/** Props for the ScrollView around a DragList, and the handle to pass to it. */
export function useDragScroll() {
  const ref = useRef<ScrollView>(null);
  const y = useRef(0);
  const size = useRef({ content: 0, view: 0 });
  const [enabled, setEnabled] = useState(true);
  const dragScroll = useMemo<DragScroll>(() => ({ ref, y, size, lock: (on) => setEnabled(!on) }), []);
  const scrollProps = {
    ref,
    scrollEnabled: enabled,
    scrollEventThrottle: 16,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      y.current = e.nativeEvent.contentOffset.y;
    },
    onLayout: (e: LayoutChangeEvent) => {
      size.current.view = e.nativeEvent.layout.height;
    },
    onContentSizeChange: (_w: number, h: number) => {
      size.current.content = h;
    },
  };
  return { scrollProps, dragScroll, dragging: !enabled };
}

export type DragHandleProps = ViewProps;

export interface DragInfo {
  index: number;
  /** True while this row is being dragged. */
  active: boolean;
  /** Spread onto the view that starts a drag (see DragHandle). */
  handle: DragHandleProps;
}

interface Props<T> {
  data: T[];
  keyOf: (item: T, index: number) => string;
  renderItem: (item: T, info: DragInfo) => React.ReactNode;
  onReorder: (from: number, to: number) => void;
  scroll?: DragScroll;
  /** Used for the handle's accessibility label, e.g. the exercise name. */
  labelOf?: (item: T) => string;
}

type Layout = { y: number; h: number };

const EDGE = 80;

export function DragList<T>({ data, keyOf, renderItem, onReorder, scroll, labelOf }: Props<T>) {
  const keys = data.map(keyOf);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const propsRef = useRef({ onReorder, scroll, data, labelOf });
  propsRef.current = { onReorder, scroll, data, labelOf };

  const layouts = useRef(new Map<string, Layout>());
  const offsets = useRef(new Map<string, Animated.Value>());
  const responders = useRef(new Map<string, PanResponderInstance>());
  const lift = useRef(new Animated.Value(0)).current;
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const drag = useRef<{ key: string; from: number; to: number; dy: number; pageY: number; scroll0: number; top: number; raf: number } | null>(null);

  const offset = (k: string) => {
    let v = offsets.current.get(k);
    if (!v) {
      v = new Animated.Value(0);
      offsets.current.set(k, v);
    }
    return v;
  };

  // New order committed: every row is back in normal flow, so clear the shifts before paint.
  const order = keys.join('|');
  useLayoutEffect(() => {
    offsets.current.forEach((v) => v.setValue(0));
  }, [order]);

  const gapAndLayouts = () => {
    const ls = keysRef.current.map((k) => layouts.current.get(k) ?? { y: 0, h: 0 });
    const gap = ls.length > 1 ? Math.max(0, ls[1].y - ls[0].y - ls[0].h) : 0;
    return { ls, gap };
  };

  /** Where the dragged row would land, and slide the others to make room. */
  const update = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const s = propsRef.current.scroll;
    const t = d.dy + (s ? s.y.current - d.scroll0 : 0);
    offset(d.key).setValue(t);
    const { ls, gap } = gapAndLayouts();
    const a = d.from;
    const center = ls[a].y + ls[a].h / 2 + t;
    let to = a;
    for (let i = a + 1; i < ls.length; i++) if (center > ls[i].y + ls[i].h / 2) to++;
    for (let i = 0; i < a; i++) if (center < ls[i].y + ls[i].h / 2) to--;
    if (to !== d.to) {
      d.to = to;
      Haptics.selectionAsync().catch(() => {});
      const step = ls[a].h + gap;
      keysRef.current.forEach((k, i) => {
        if (i === a) return;
        const shift = i > a && i <= to ? -step : i < a && i >= to ? step : 0;
        Animated.timing(offset(k), { toValue: shift, duration: 170, useNativeDriver: nativeDriver }).start();
      });
    }
  }, []);

  /** Scrolls the parent while the finger rests near its top or bottom edge. */
  function tick() {
    const d = drag.current;
    const s = propsRef.current.scroll;
    if (!d || !s) return;
    const { view, content } = s.size.current;
    let v = 0;
    if (view > 0) {
      if (d.pageY < d.top + EDGE) v = -Math.ceil((d.top + EDGE - d.pageY) / 5);
      else if (d.pageY > d.top + view - EDGE) v = Math.ceil((d.pageY - (d.top + view - EDGE)) / 5);
    }
    if (v) {
      const max = Math.max(0, content - view);
      const ny = Math.min(max, Math.max(0, s.y.current + Math.max(-18, Math.min(18, v))));
      if (ny !== s.y.current) {
        s.ref.current?.scrollTo({ y: ny, animated: false });
        s.y.current = ny;
        update();
      }
    }
    d.raf = requestAnimationFrame(tick);
  }

  const end = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    drag.current = null;
    const { ls, gap } = gapAndLayouts();
    const { from, to, key } = d;
    let final = 0;
    if (to > from) for (let i = from + 1; i <= to; i++) final += ls[i].h + gap;
    else for (let i = to; i < from; i++) final -= ls[i].h + gap;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(lift, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }).start();
    Animated.timing(offset(key), { toValue: final, duration: 160, useNativeDriver: nativeDriver }).start(() => {
      propsRef.current.scroll?.lock(false);
      setActiveKey(null);
      if (to !== from) propsRef.current.onReorder(from, to);
      else offsets.current.forEach((v) => v.setValue(0));
    });
  }, [lift]);

  const responder = (k: string) => {
    let r = responders.current.get(k);
    if (r) return r;
    r = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        const from = keysRef.current.indexOf(k);
        if (from < 0 || drag.current) return;
        const s = propsRef.current.scroll;
        drag.current = { key: k, from, to: from, dy: 0, pageY: e.nativeEvent.pageY, scroll0: s?.y.current ?? 0, top: 0, raf: 0 };
        s?.lock(true);
        setActiveKey(k);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        Animated.spring(lift, { toValue: 1, useNativeDriver: nativeDriver, speed: 30, bounciness: 6 }).start();
        const node = s?.ref.current as unknown as { measureInWindow?: (cb: (x: number, y: number) => void) => void } | null;
        if (node?.measureInWindow) {
          node.measureInWindow((_x, y) => {
            if (drag.current) drag.current.top = y;
          });
        }
        if (s) drag.current.raf = requestAnimationFrame(tick);
      },
      onPanResponderMove: (_e, g) => {
        const d = drag.current;
        if (!d || d.key !== k) return;
        d.dy = g.dy;
        d.pageY = g.moveY;
        update();
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
    responders.current.set(k, r);
    return r;
  };

  const move = (from: number, d: number) => {
    const to = from + d;
    if (to < 0 || to >= keysRef.current.length) return;
    Haptics.selectionAsync().catch(() => {});
    propsRef.current.onReorder(from, to);
  };

  return (
    <View>
      {data.map((item, i) => {
        const k = keys[i];
        const active = activeKey === k;
        const label = labelOf ? labelOf(item) : `item ${i + 1}`;
        const handle: DragHandleProps = {
          ...responder(k).panHandlers,
          accessible: true,
          accessibilityRole: 'adjustable',
          accessibilityLabel: `Reorder ${label}`,
          accessibilityHint: 'Drag to move. Swipe up or down to move one place.',
          accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
          onAccessibilityAction: (e) => move(i, e.nativeEvent.actionName === 'increment' ? 1 : -1),
        };
        return (
          <Animated.View
            key={k}
            onLayout={(e) => layouts.current.set(k, { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
            style={{
              zIndex: active ? 10 : 0,
              opacity: active ? 0.96 : 1,
              transform: [{ translateY: offset(k) }, { scale: active ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) : 1 }],
            }}
          >
            {renderItem(item, { index: i, active, handle })}
          </Animated.View>
        );
      })}
    </View>
  );
}

const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object) : null;

/** The six-dot grip to drag a row by. Spread `handle` from renderItem onto it. */
export function DragHandle({ handle, active, size = 44 }: { handle: DragHandleProps; active?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      {...handle}
      hitSlop={6}
      style={[{ width: size, height: size, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.primarySoft : colors.cardAlt }, webGrab]}
    >
      <Ionicons name="reorder-three" size={24} color={active ? colors.primary : colors.textMuted} />
    </View>
  );
}

/** A copy of the list with one item moved. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}
