import React, { useMemo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Badge, Button, Card, Field, Screen, Segmented, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Kettle } from '@/components/Mascot';
import { RankBadge } from '@/components/RankBadge';
import { useStore } from '@/store/StoreProvider';
import { useSocial } from '@/lib/useSocial';
import { addFriend, DEMO, formatCode, levelsGained, makeSnapshot, scoreGained } from '@/lib/social';
import { FREE_FRIEND_LIMIT, isPro } from '@/lib/pro';
import { STAGES } from '@/lib/progression';
import { spacing, useTheme } from '@/theme';
import type { Friend, SocialSnapshot } from '@/lib/types';

type Board = 'rank' | 'growth' | 'levels';

const BOARD_VALUE: Record<Board, (s: SocialSnapshot) => number> = {
  rank: (s) => s.score,
  growth: scoreGained,
  levels: levelsGained,
};

export default function FriendsScreen() {
  const { state, dispatch } = useStore();
  const { colors, dark } = useTheme();
  const { me, social, error } = useSocial();
  const pro = isPro(state);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [board, setBoard] = useState<Board>('rank');
  const mine = useMemo(() => makeSnapshot(state), [state]);

  const rows = useMemo(() => {
    const list: (SocialSnapshot & { id: string; you?: boolean })[] = social.friends.map((f) => ({ ...f }));
    if (mine) list.push({ ...mine, id: 'me', you: true, name: 'You' });
    const v = BOARD_VALUE[board];
    return list.sort((a, b) => v(b) - v(a) || b.level - a.level);
  }, [social.friends, mine, board]);

  const unread = (f: Friend) => (social.chats[f.id] ?? []).filter((m) => m.from !== me?.id && m.at > (social.read[f.id] ?? 0)).length;

  const add = async () => {
    if (!me) return;
    if (!pro && social.friends.length >= FREE_FRIEND_LIMIT) {
      router.push('/pro?feature=friends');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const f = await addFriend(me, code);
      if (social.friends.some((x) => x.id === f.id)) throw new Error(`${f.name} is already in your crew.`);
      dispatch({ type: 'setFriends', friends: [...social.friends, f] });
      setCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const share = () => {
    if (!me) return;
    Share.share({ message: `Train with me on Fitness Buddy! Add my code ${formatCode(me.code)} and let’s race up the ranks.` }).catch(() => {});
  };

  return (
    <Screen>
      <FadeIn>
        <Card style={{ backgroundColor: '#0F1F17', borderWidth: dark ? 1 : 0, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Kettle size={56} mood="wink" skin={state.settings.mascotSkin} animate />
            <View style={{ flex: 1 }}>
              <T size={12} weight="700" color="rgba(255,255,255,0.6)">YOUR FRIEND CODE</T>
              <T size={26} weight="800" color="#fff" style={{ letterSpacing: 2 }}>{me ? formatCode(me.code) : '······'}</T>
            </View>
            <PressScale accessibilityLabel="Share my code" onPress={share} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="share-social" size={20} color={colors.onPrimary} />
            </PressScale>
          </View>
          <T size={12} color="rgba(255,255,255,0.6)" style={{ marginTop: spacing.sm }}>
            Friends see your rank, level and workouts. Never your food, weight or photos.
          </T>
        </Card>
      </FadeIn>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <T weight="800">Add a friend</T>
          <T size={12} muted>{pro ? `${social.friends.length} in your crew` : `${social.friends.length}/${FREE_FRIEND_LIMIT} free`}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Field value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Their code, e.g. LEN-A26" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={add} />
          </View>
          <Button title="Add" icon="person-add" onPress={add} loading={adding} disabled={!me || code.replace(/[^A-Za-z0-9]/g, '').length !== 6} />
        </View>
        {addError && <T size={13} color={colors.danger}>{addError}</T>}
        {error && <T size={13} color={colors.danger}>Couldn’t reach the crew server: {error}</T>}
        {DEMO && (
          <T size={12} muted style={{ marginTop: 4 }}>
            Demo crew: in this preview your friends and their replies are simulated. Any 6-character code adds a new demo friend.
          </T>
        )}
      </Card>

      <Segmented<Board>
        value={board}
        onChange={setBoard}
        options={[
          { key: 'rank', label: 'Strongest' },
          { key: 'growth', label: 'Fastest growing' },
          { key: 'levels', label: 'Most levels' },
        ]}
        style={{ marginBottom: spacing.md }}
      />

      <Card style={{ paddingVertical: 4 }}>
        {rows.map((r, i) => {
          const stage = STAGES[r.stage] ?? STAGES[0];
          const f = social.friends.find((x) => x.id === r.id);
          const n = f ? unread(f) : 0;
          const value = board === 'rank' ? `${Math.round(r.score)} pts` : board === 'growth' ? `+${scoreGained(r)} pts` : `+${levelsGained(r)} lvls`;
          return (
            <Pressable
              key={r.id}
              onPress={() => (r.you ? router.push('/rank') : router.push(`/friend/${r.id}`))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}
            >
              <T weight="800" size={15} color={i === 0 ? '#E9B53A' : colors.textMuted} style={{ width: 22, textAlign: 'center' }}>
                {i + 1}
              </T>
              <RankBadge stage={stage} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T weight="800" numberOfLines={1}>{r.name}</T>
                  {r.you && <Badge label="YOU" color={colors.primary} />}
                </View>
                <T size={12} muted numberOfLines={1}>
                  {stage.label} · Lv {r.level} · {r.weekWorkouts} this week
                </T>
              </View>
              <T weight="800" size={14}>{value}</T>
              {!r.you && (
                <Pressable accessibilityLabel={`Message ${r.name}`} onPress={() => router.push(`/chat/${r.id}`)} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chatbubble-ellipses" size={17} color={colors.primary} />
                  {n > 0 && (
                    <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <T size={10} weight="800" color="#fff">{n}</T>
                    </View>
                  )}
                </Pressable>
              )}
            </Pressable>
          );
        })}
        {!social.friends.length && (
          <T muted center style={{ paddingVertical: spacing.lg }}>
            Your crew is empty. Share your code or add a friend’s to start racing.
          </T>
        )}
      </Card>
    </Screen>
  );
}
