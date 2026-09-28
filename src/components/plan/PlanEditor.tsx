import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Sheet, T } from '../ui';
import { PressScale } from '../motion';
import { WeekRhythm } from './Glyphs';
import { useStore } from '@/store/StoreProvider';
import { DAY_SHORT, findSession, findSplit, planFromSplit, sessionChoices, SPLITS } from '@/lib/plan';
import { todayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme';

/** Bottom sheet to pick a split and set each weekday to a session or rest. */
export function PlanEditor({ visible, onClose, initialSplit }: { visible: boolean; onClose: () => void; initialSplit?: string }) {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const [split, setSplit] = useState(state.plan?.split ?? initialSplit ?? 'ppl');
  const [week, setWeek] = useState<(string | null)[]>(state.plan?.week ?? findSplit(split).week);

  useEffect(() => {
    if (!visible) return;
    const s = state.plan?.split ?? initialSplit ?? 'ppl';
    setSplit(s);
    setWeek(state.plan && state.plan.split === s ? state.plan.week : findSplit(s).week);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const choices = sessionChoices({ plan: { split, week, since: '' }, routines: state.routines });
  const trainDays = week.filter(Boolean).length;

  const pickSplit = (id: string) => {
    setSplit(id);
    if (id !== 'custom') setWeek(findSplit(id).week);
  };
  const save = () => {
    const since = state.plan?.since ?? todayKey();
    dispatch({ type: 'setPlan', plan: { ...planFromSplit(split, since, week), overrides: state.plan?.overrides } });
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
