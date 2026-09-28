import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Sheet, T } from '../ui';
import { PressScale } from '../motion';
import { WeekRhythm } from './Glyphs';
import { useStore } from '@/store/StoreProvider';
import { DAY_SHORT, findSession, findSplit, planFromSplit, sessionChoices, SPLITS } from '@/lib/plan';
import { todayKey } from '@/lib/dates';
import { font, radius, spacing, useTheme } from '@/theme';

type Draft = { split: string; week: (string | null)[]; name: string };

/**
 * The editor closes while you build a workout (the builder is its own screen),
 * so its unsaved state waits here and the editor reopens with it afterwards.
 */
let parked: Draft | null = null;
export const hasParkedPlan = () => parked !== null;

/** Bottom sheet to pick a split and set each weekday to a session or rest. */
export function PlanEditor({ visible, onClose, initialSplit }: { visible: boolean; onClose: () => void; initialSplit?: string }) {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const [split, setSplit] = useState(state.plan?.split ?? initialSplit ?? 'ppl');
  const [week, setWeek] = useState<(string | null)[]>(state.plan?.week ?? findSplit(split).week);
  const [name, setName] = useState(state.plan?.name ?? '');

  useEffect(() => {
    if (!visible) return;
    if (parked) {
      setSplit(parked.split);
      setWeek(parked.week);
      setName(parked.name);
      parked = null;
      return;
    }
    const s = initialSplit ?? state.plan?.split ?? 'ppl';
    setSplit(s);
    setWeek(state.plan && state.plan.split === s ? state.plan.week : findSplit(s).week);
    setName(state.plan?.name ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const choices = sessionChoices({ plan: { split, week, since: '' }, routines: state.routines });
  const custom = split === 'custom';
  // The split's own sessions (Push, Pull, Legs…): tap one to set its exercises.
  const splitSessions = custom ? [] : findSplit(split).sessions.map((id) => findSession(state, id)).filter((x): x is NonNullable<typeof x> => !!x);
  const editSession = (name: string) => {
    const mine = state.routines.find((r) => r.name.trim().toLowerCase() === name.toLowerCase());
    build(mine ? { id: mine.id } : { name });
  };
  const build = (params: { id?: string; name?: string }) => {
    parked = { split, week, name };
    onClose();
    router.push({ pathname: '/routine-builder', params });
  };
  const trainDays = week.filter(Boolean).length;

  const pickSplit = (id: string) => {
    setSplit(id);
    if (id !== 'custom') setWeek(findSplit(id).week);
  };
  const save = () => {
    const since = state.plan?.since ?? todayKey();
    dispatch({ type: 'setPlan', plan: { ...planFromSplit(split, since, week, name), overrides: state.plan?.overrides } });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Your training week">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
        {SPLITS.map((s) => {
          const on = s.id === split;
          return (
            <PressScale
              key={s.id}
              onPress={() => pickSplit(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ width: 128, padding: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : 'transparent', gap: 6 }}
            >
              <WeekRhythm week={s.id === split ? week : s.week} color={on ? colors.primary : colors.textMuted} rest={colors.track} />
              <T size={13} weight="800" numberOfLines={1}>{s.name}</T>
              <T size={11} muted numberOfLines={1}>{s.blurb}</T>
            </PressScale>
          );
        })}
      </ScrollView>

      {!custom && splitSessions.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <T size={12} weight="800" muted style={{ marginBottom: 6, letterSpacing: 1 }}>WORKOUTS IN THIS SPLIT</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }}>
            {splitSessions.map((s) => (
              <PressScale
                key={s.id}
                onPress={() => editSession(s.name)}
                accessibilityLabel={`Set ${s.name} exercises`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: s.color + '99' }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
                <T size={13} weight="800">{s.name}</T>
                <T size={11} muted>{s.routine.exercises.length} ex</T>
                <Ionicons name="create-outline" size={13} color={colors.textMuted} />
              </PressScale>
            ))}
          </ScrollView>
          <T size={12} muted style={{ marginTop: 6 }}>Tap one to choose its exercises, sets and reps.</T>
        </View>
      )}

      {custom && (
        <View style={{ marginTop: spacing.lg }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name your split (e.g. Summer cut)"
            placeholderTextColor={colors.textMuted}
            maxLength={28}
            style={{ backgroundColor: colors.cardAlt, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 16, ...font('700') }}
          />
          <T size={12} weight="800" muted style={{ marginTop: spacing.md, marginBottom: 6, letterSpacing: 1 }}>YOUR WORKOUTS</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }}>
            <PressScale
              onPress={() => build({})}
              accessibilityLabel="Create a workout"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary }}
            >
              <Ionicons name="add" size={15} color={colors.onPrimary} />
              <T size={13} weight="800" color={colors.onPrimary}>New workout</T>
            </PressScale>
            {state.routines.map((r) => (
              <PressScale
                key={r.id}
                onPress={() => build({ id: r.id })}
                accessibilityLabel={`Edit ${r.name}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border }}
              >
                <T size={13} weight="800">{r.name}</T>
                <Ionicons name="create-outline" size={13} color={colors.textMuted} />
              </PressScale>
            ))}
          </ScrollView>
          <T size={12} muted style={{ marginTop: 6 }}>
            {state.routines.length ? 'Tap one to change its exercises. Then give each day a workout or rest below.' : 'Build your Push, Pull or any workout you like, then give each day a workout or rest below.'}
          </T>
        </View>
      )}

      <View style={{ marginTop: spacing.lg, gap: 6 }}>
        {DAY_SHORT.map((d, i) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T size={12} weight="800" muted style={{ width: 32 }}>{d.toUpperCase()}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
              {[...choices.map((c) => c.id), null].map((id) => {
                const on = week[i] === id;
                const s = findSession(state, id);
                const tint = s?.color ?? colors.textMuted;
                return (
                  <PressScale
                    key={id ?? 'rest'}
                    onPress={() => setWeek(week.map((x, j) => (j === i ? id : x)))}
                    accessibilityLabel={`${d}: ${s?.name ?? 'Rest'}`}
                    accessibilityState={{ selected: on }}
                    style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: on ? tint : colors.cardAlt }}
                  >
                    <T size={12} weight="800" color={on ? '#fff' : colors.textMuted}>{s?.name ?? 'Rest'}</T>
                  </PressScale>
                );
              })}
            </ScrollView>
          </View>
        ))}
      </View>

      <T size={12} muted style={{ marginTop: spacing.md }}>
        {trainDays} training {trainDays === 1 ? 'day' : 'days'} · {7 - trainDays} rest. Your daily quests follow this plan, and planned rest days keep your streak.
      </T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
        {state.plan ? (
          <Button
            title="Remove"
            variant="ghost"
            onPress={() => {
              dispatch({ type: 'setPlan', plan: null });
              onClose();
            }}
          />
        ) : null}
        <Button title="Save plan" onPress={save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}
