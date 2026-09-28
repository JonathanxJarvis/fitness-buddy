import React from 'react';
import { View } from 'react-native';
import { Button, Sheet, T } from '../ui';
import { PressScale } from '../motion';
import { MiniMoon } from './Glyphs';
import { useStore } from '@/store/StoreProvider';
import { DAY_NAMES, plannedId, sessionChoices, weekdayIndex, withDay } from '@/lib/plan';
import { prettyDate, shortDate } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme';

/** Change one date: pick a different session or make it a rest day. The weekly plan stays. */
export function DaySheet({ date, onClose, onEditPlan }: { date: string | null; onClose: () => void; onEditPlan: () => void }) {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const plan = state.plan;
  const current = date && plan ? plannedId(plan, date) ?? null : null;
  const weekly = date && plan ? plan.week[weekdayIndex(date)] ?? null : null;
  const choices = sessionChoices(state);

  const set = (id: string | null) => {
    if (date && plan) dispatch({ type: 'setPlan', plan: withDay(plan, date, id) });
    onClose();
  };

  const title = date ? (prettyDate(date).includes(',') ? `${DAY_NAMES[weekdayIndex(date)]}, ${shortDate(date)}` : `${prettyDate(date)} · ${DAY_NAMES[weekdayIndex(date)]}`) : '';

  return (
    <Sheet visible={!!date} onClose={onClose} title={title}>
      <T size={13} muted style={{ marginTop: -8, marginBottom: spacing.md }}>
        Only this date changes. Your weekly plan stays the same.
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[...choices, null].map((s) => {
          const id = s?.id ?? null;
          const on = id === current;
          const tint = s?.color ?? colors.textMuted;
          return (
            <PressScale
              key={id ?? 'rest'}
              onPress={() => set(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? tint : colors.border, backgroundColor: on ? tint + '1A' : 'transparent' }}
            >
              <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s ? tint : colors.track, alignItems: 'center', justifyContent: 'center' }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {!s ? <MiniMoon color={colors.textMuted} /> : null}
                  <T size={14} weight="800" numberOfLines={1}>{s ? s.name : 'Rest'}</T>
                </View>
                <T size={11} muted numberOfLines={1}>
                  {s ? `${s.routine.exercises.length} exercises` : 'Walk, stretch, recover'}
                  {id === weekly ? ' · usual' : ''}
                </T>
              </View>
            </PressScale>
          );
        })}
      </View>
      <Button
        title="Edit weekly plan"
        variant="secondary"
        small
        style={{ marginTop: spacing.lg }}
        onPress={() => {
          onClose();
          setTimeout(onEditPlan, 220);
        }}
      />
    </Sheet>
  );
}
