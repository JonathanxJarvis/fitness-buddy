import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, T } from './ui';
import { PressScale } from './motion';
import { useStore } from '@/store/StoreProvider';
import { useCelebrate } from './Celebrate';
import { CHEST_XP, isClaimed, questStates, weeklyChallenge } from '@/lib/quests';
import { radius, useTheme } from '@/theme';

const GOLD = '#E9B53A';

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const { colors } = useTheme();
  const pct = Math.min(1, target ? value / target : 0);
  return (
    <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : `${Math.round(n)}`);

/** Today's three quests, the daily chest and the weekly challenge. */
export function DailyQuests({ date }: { date: string }) {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const quests = useMemo(() => questStates(state, date), [state, date]);
  const week = useMemo(() => weeklyChallenge(state, date), [state, date]);
  const allClaimed = quests.every((q) => q.claimed);
  const chestOpen = isClaimed(state.questLog, 'chest', date);
  const doneCount = quests.filter((q) => q.claimed).length;

  const celebrate = useCelebrate();
  const claim = (id: string, xp: number, when = date) => {
    if (id === 'chest') celebrate({ kind: 'chest', xp, title: 'Daily chest' });
    else if (id === 'week') celebrate({ kind: 'chest', xp, title: 'Week conquered', color: '#22B573' });
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    dispatch({ type: 'claimReward', entry: { id, date: when, xp } });
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="flash" size={16} color={GOLD} />
        <T weight="800" style={{ flex: 1, marginLeft: 6 }}>Daily quests</T>
        <T size={12} weight="700" muted>{doneCount}/3 done</T>
      </View>
      {quests.map(({ quest, value, target, done, claimed }) => (
        <View key={quest.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: claimed ? colors.primarySoft : colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={(claimed ? 'checkmark' : quest.icon) as never} size={17} color={claimed ? colors.primary : colors.text} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={14} weight="700" numberOfLines={1} style={{ flex: 1, textDecorationLine: claimed ? 'line-through' : 'none', opacity: claimed ? 0.6 : 1 }}>
                {quest.title}
              </T>
              <T size={12} muted>
                {fmt(Math.min(value, target))}/{fmt(target)}
              </T>
            </View>
            <Bar value={value} target={target} color={done ? colors.primary : GOLD} />
          </View>
          {done && !claimed ? (
            <PressScale onPress={() => claim(`q:${quest.id}`, quest.xp)} accessibilityLabel={`Claim ${quest.xp} XP`} style={{ backgroundColor: GOLD, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
              <T size={12} weight="800" color="#3A2A00">+{quest.xp} XP</T>
            </PressScale>
          ) : (
            <T size={12} weight="800" color={claimed ? colors.primary : colors.textMuted} style={{ width: 52, textAlign: 'right' }}>
              {claimed ? 'Claimed' : `${quest.xp} XP`}
            </T>
          )}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <PressScale
          disabled={!allClaimed || chestOpen}
          onPress={() => claim('chest', CHEST_XP)}
          accessibilityLabel="Daily chest"
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: allClaimed && !chestOpen ? GOLD : colors.cardAlt }}
        >
          <Ionicons name={chestOpen ? 'gift' : 'gift-outline'} size={20} color={allClaimed && !chestOpen ? '#3A2A00' : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <T size={12} weight="800" color={allClaimed && !chestOpen ? '#3A2A00' : colors.text}>
              {chestOpen ? 'Chest opened' : allClaimed ? 'Open chest!' : 'Daily chest'}
            </T>
            <T size={11} color={allClaimed && !chestOpen ? '#3A2A00' : colors.textMuted}>{chestOpen ? `+${CHEST_XP} XP collected` : `Finish all 3 · +${CHEST_XP} XP`}</T>
          </View>
        </PressScale>
        <PressScale
          disabled={!week.done || week.claimed}
          onPress={() => claim('week', week.xp, week.monday)}
          accessibilityLabel="Weekly challenge"
          style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: week.done && !week.claimed ? colors.primary : colors.cardAlt, gap: 5 }}
        >
          <T size={12} weight="800" color={week.done && !week.claimed ? colors.onPrimary : colors.text}>
            {week.claimed ? 'Week conquered' : week.done ? `Claim +${week.xp} XP` : `Train ${week.target}× this week`}
          </T>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: week.target }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < week.value ? (week.done && !week.claimed ? colors.onPrimary : colors.primary) : colors.track }} />
            ))}
          </View>
        </PressScale>
      </View>
    </Card>
  );
}
