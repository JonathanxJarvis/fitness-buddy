import React, { useMemo, useState } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Card, T } from './ui';
import { PressScale, usePulse } from './motion';
import { useStore } from '@/store/StoreProvider';
import { useCelebrate } from './Celebrate';
import { ChestEye, ChestInfo } from './pet/ChestInfo';
import { MiniChest } from './pet/MiniChest';
import { LinearGradient } from 'expo-linear-gradient';
import { CHEST_XP, isClaimed, questStates, weeklyChallenge, weeklyPr, type QuestState } from '@/lib/quests';
import { planDay } from '@/lib/plan';
import { radius, useTheme } from '@/theme';

const GOLD = '#E9B53A';

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const { colors } = useTheme();
  const pct = Math.min(1, target ? value / target : 0);
  return (
    <View style={{ height: 5, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: 5, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : `${Math.round(n)}`);

function QuestRow({ q, onClaim, onConfirm }: { q: QuestState; onClaim: () => void; onConfirm: () => void }) {
  const { colors } = useTheme();
  const { quest, value, target, done, claimed } = q;
  const numeric = target > 1;
  const canConfirm = !!quest.confirm && !done && !claimed;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: claimed ? colors.primarySoft : colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={(claimed ? 'checkmark' : quest.icon) as never} size={17} color={claimed ? colors.primary : colors.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T size={14} weight="700" numberOfLines={1} style={{ flex: 1, textDecorationLine: claimed ? 'line-through' : 'none', opacity: claimed ? 0.6 : 1 }}>
            {quest.title}
          </T>
          {numeric && !claimed ? (
            <T size={12} muted>
              {fmt(Math.min(value, target))}/{fmt(target)}
            </T>
          ) : null}
        </View>
        {numeric && !claimed ? (
          <Bar value={value} target={target} color={done ? colors.primary : GOLD} />
        ) : (
          <T size={12} muted numberOfLines={1}>{claimed ? `+${quest.xp} XP earned` : quest.detail}</T>
        )}
      </View>
      {done && !claimed ? (
        <PressScale onPress={onClaim} accessibilityLabel={`Claim ${quest.xp} XP`} style={{ backgroundColor: GOLD, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
          <T size={12} weight="800" color="#3A2A00">+{quest.xp} XP</T>
        </PressScale>
      ) : canConfirm ? (
        <PressScale
          onPress={onConfirm}
          accessibilityLabel={`${quest.confirm}: ${quest.title}`}
          style={{ borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="checkmark" size={13} color={colors.primary} />
          <T size={12} weight="800" color={colors.primary}>{quest.confirm}</T>
        </PressScale>
      ) : (
        <T size={12} weight="800" color={claimed ? colors.primary : colors.textMuted} style={{ minWidth: 44, textAlign: 'right' }}>
          {claimed ? '' : `${quest.xp} XP`}
        </T>
      )}
    </View>
  );
}

/** The weekly chest: one dark card, a short goal, a bar of days. Tap to open when it's earned. */
function WeeklyChest({ week, onOpen }: { week: ReturnType<typeof weeklyChallenge>; onOpen: () => void }) {
  const hot = week.done && !week.claimed;
  const glow = usePulse();
  return (
    <PressScale disabled={!hot} onPress={onOpen} accessibilityLabel={hot ? `Open the weekly chest, ${week.xp} XP` : `Weekly chest: ${week.title}`} style={{ marginTop: 8 }}>
      <LinearGradient colors={['#1B2F24', '#0E1712']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Animated.View style={{ opacity: hot ? glow.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) : 1, transform: [{ scale: hot ? glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) : 1 }] }}>
          <MiniChest size={44} state={week.claimed ? 'open' : hot ? 'ready' : 'locked'} />
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T size={10} weight="800" color={GOLD} style={{ letterSpacing: 1.4 }}>WEEKLY CHEST</T>
            <View style={{ flex: 1 }} />
            <T size={11} weight="800" color="rgba(255,255,255,0.55)">{week.claimed ? 'Opened' : `${week.value}/${week.target}`}</T>
          </View>
          <T size={14} weight="800" color="#fff" numberOfLines={1}>{week.claimed ? `+${week.xp} XP collected` : hot ? 'Tap to open' : week.title}</T>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: week.target }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < week.value ? GOLD : 'rgba(255,255,255,0.12)' }} />
            ))}
          </View>
        </View>
        {!week.claimed && (
          <View style={{ borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: hot ? GOLD : 'rgba(233,181,58,0.14)' }}>
            <T size={12} weight="800" color={hot ? '#3A2A00' : GOLD}>+{week.xp}</T>
          </View>
        )}
      </LinearGradient>
    </PressScale>
  );
}

/** Today's three quests (they follow the training plan), the daily chest and the weekly challenge. */
export function DailyQuests({ date }: { date: string }) {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const quests = useMemo(() => questStates(state, date), [state, date]);
  const week = useMemo(() => weeklyChallenge(state, date), [state, date]);
  const pr = useMemo(() => weeklyPr(state, date), [state, date]);
  const day = planDay(state, date);
  const allClaimed = quests.every((q) => q.claimed);
  const chestOpen = isClaimed(state.questLog, 'chest', date);
  const doneCount = quests.filter((q) => q.claimed).length;
  const [peek, setPeek] = useState<'daily' | null>(null);
  const toggle = (k: 'daily') => setPeek((p) => (p === k ? null : k));
  const dailyHot = allClaimed && !chestOpen;

  const celebrate = useCelebrate();
  const claim = (id: string, xp: number, when = date) => {
    if (id === 'chest') celebrate({ kind: 'chest', xp, title: 'Daily chest' });
    else if (id === 'week') celebrate({ kind: 'chest', xp, title: 'Week conquered', color: '#22B573' });
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    dispatch({ type: 'claimReward', entry: { id, date: when, xp } });
  };
  // Tap-to-confirm quests: the check-in and the XP in one tap.
  const confirm = (q: QuestState) => {
    dispatch({ type: 'setCheckin', date, id: q.quest.id, on: true });
    claim(`q:${q.quest.id}`, q.quest.xp);
  };

  const dayLabel = day.kind === 'train' ? `${day.session.name} day` : day.kind === 'rest' ? 'Rest day' : null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Ionicons name="flash" size={16} color={GOLD} />
        <T weight="800" style={{ marginLeft: 6 }}>Daily quests</T>
        {dayLabel ? (
          <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: day.kind === 'train' ? day.session.color + '22' : colors.primarySoft }}>
            <T size={11} weight="800" color={day.kind === 'train' ? day.session.color : colors.primary}>{dayLabel}</T>
          </View>
        ) : (
          <T size={11} weight="700" color={colors.primary} style={{ marginLeft: 8 }} onPress={() => router.navigate('/train')}>
            Set your plan
          </T>
        )}
        <View style={{ flex: 1 }} />
        <T size={12} weight="700" muted>{doneCount}/3 done</T>
      </View>
      {quests.map((q) => (
        <QuestRow key={q.quest.id} q={q} onClaim={() => claim(`q:${q.quest.id}`, q.quest.xp)} onConfirm={() => confirm(q)} />
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <PressScale
            disabled={!dailyHot}
            onPress={() => claim('chest', CHEST_XP)}
            accessibilityLabel="Daily chest"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingRight: 34, borderRadius: radius.md, backgroundColor: dailyHot ? GOLD : colors.cardAlt }}
          >
            <Ionicons name={chestOpen ? 'gift' : 'gift-outline'} size={20} color={dailyHot ? '#3A2A00' : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <T size={12} weight="800" color={dailyHot ? '#3A2A00' : colors.text}>
                {chestOpen ? 'Chest opened' : allClaimed ? 'Open chest!' : 'Daily chest'}
              </T>
              <T size={11} color={dailyHot ? '#3A2A00' : colors.textMuted}>{chestOpen ? `+${CHEST_XP} XP collected` : `Finish 3 · +${CHEST_XP} XP`}</T>
            </View>
          </PressScale>
          {!chestOpen && (
            <View style={{ position: 'absolute', top: 6, right: 6 }}>
              <ChestEye open={peek === 'daily'} onPress={() => toggle('daily')} size={24} color={dailyHot ? '#3A2A00' : colors.textMuted} bg={dailyHot ? 'rgba(58,42,0,0.12)' : colors.card} label="What’s in the daily chest" />
            </View>
          )}
        </View>
      </View>
      {peek === 'daily' && !chestOpen ? <ChestInfo key="d" kind="daily" xp={CHEST_XP} onClose={() => setPeek(null)} style={{ marginTop: 8 }} /> : null}
      <WeeklyChest week={week} onOpen={() => claim('week', week.xp, week.monday)} />
      {pr.done && !pr.claimed ? (
        <PressScale
          onPress={() => claim('pr-week', pr.xp, pr.monday)}
          accessibilityLabel="Claim weekly PR bonus"
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: GOLD, borderStyle: 'dashed' }}
        >
          <Ionicons name="trophy" size={16} color={GOLD} />
          <T size={12} weight="800" style={{ flex: 1 }}>New PR this week. Bonus unlocked!</T>
          <T size={12} weight="800" color={GOLD}>+{pr.xp} XP</T>
        </PressScale>
      ) : null}
    </Card>
  );
}
