import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, T } from '@/components/ui';
import { FadeIn, PressScale, TypingDots } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { Flame } from '@/components/people/Glyphs';
import { clockTime } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { DEMO, demoReplyText, fetchMessages, OFFLINE, sendMessage } from '@/lib/social';
import { STAGES } from '@/lib/progression';
import { font, radius, spacing, useTheme } from '@/theme';

const QUICK = ['Trained today?', 'New PR!', 'Race you to the next rank', 'Gym tonight?'];

function dayLabel(at: number): string {
  const d = new Date(at);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at >= start) return 'Today';
  if (at >= start - 86_400_000) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function seen(at: number): string {
  const h = Math.round((Date.now() - at) / 3_600_000);
  if (h < 1) return 'active now';
  if (h < 24) return `active ${h}h ago`;
  return `active ${Math.round(h / 24)}d ago`;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = state.social?.me;
  const f = state.social?.friends.find((x) => x.id === id);
  const messages = state.social?.chats[id] ?? [];
  const lastAt = messages.length ? messages[messages.length - 1].at : 0;

  // Mark read, and keep the thread scrolled to the newest message.
  useEffect(() => {
    if (lastAt) dispatch({ type: 'markRead', friendId: id, at: lastAt });
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [lastAt, typing, id, dispatch]);

  // With a real server, poll for new messages while the chat is open.
  useEffect(() => {
    if (DEMO || OFFLINE || !me) return;
    let since = lastAt;
    const tick = () =>
      fetchMessages(me, id, since)
        .then((msgs) => {
          if (msgs.length) {
            since = msgs[msgs.length - 1].at;
            dispatch({ type: 'addMessages', friendId: id, messages: msgs });
          }
        })
        .catch(() => {});
    tick();
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, id]);

  if (!f || !me) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <T muted>This chat isn’t available.</T>
      </View>
    );
  }

  const stage = STAGES[f.stage] ?? STAGES[0];

  const send = async (body = text) => {
    const clean = body.trim();
    if (!clean) return;
    setText('');
    setError(null);
    try {
      const m = await sendMessage(me, f.id, clean);
      dispatch({ type: 'addMessages', friendId: f.id, messages: [m] });
      if (DEMO) {
        setTimeout(() => setTyping(true), 500);
        setTimeout(() => {
          setTyping(false);
          dispatch({ type: 'addMessages', friendId: f.id, messages: [{ id: `r-${Date.now()}`, from: f.id, to: me.id, text: demoReplyText(f, clean), at: Date.now() }] });
        }, 1400 + Math.random() * 1200);
      }
    } catch (e) {
      setText(clean);
      setError((e as Error).message);
    }
  };

  const theirBubble = dark ? colors.cardAlt : colors.card;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
        <IconButton label="Back" icon="chevron-back" color={colors.text} onPress={() => router.back()} />
        <Pressable onPress={() => router.push(`/friend/${f.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} accessibilityLabel={`${f.name}’s profile`}>
          <Avatar person={f} stage={f.stage} size={44} petBadge={false} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="800" size={16} numberOfLines={1}>{f.name}</T>
            <T size={12} muted numberOfLines={1}>
              <T size={12} weight="700" color={stage.tier.color}>{stage.label}</T> · {seen(f.updatedAt)}
            </T>
          </View>
        </Pressable>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!messages.length && (
          <FadeIn style={{ alignItems: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.xl }}>
            <Avatar person={f} stage={f.stage} pet={f.pet} skin={f.skin} size={140} frame="ornate" mood="happy" animate />
            <T size={18} weight="800" style={{ marginTop: spacing.sm }}>You and {f.name} are friends</T>
            <T muted center style={{ marginTop: 4 }}>
              {f.name} is {stage.label}, level {f.level}. Say hi, or challenge them to a race up the ranks.
            </T>
          </FadeIn>
        )}
        {messages.map((m, i) => {
          const mine = m.from === me.id;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || dayLabel(prev.at) !== dayLabel(m.at);
          const gap = !prev || m.at - prev.at > 30 * 60_000;
          const firstOfGroup = gap || prev?.from !== m.from;
          const lastOfGroup = !next || next.from !== m.from || next.at - m.at > 30 * 60_000;
          const big = 20;
          const small = 6;
          return (
            <View key={m.id} style={{ marginTop: firstOfGroup ? 10 : 2 }}>
              {gap && (
                <T size={11} weight="600" muted center style={{ marginVertical: 8 }}>
                  {newDay ? `${dayLabel(m.at)} · ` : ''}
                  {clockTime(m.at)}
                </T>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && <View style={{ width: 30 }}>{lastOfGroup && <Avatar person={f} stage={f.stage} size={30} frame="none" petBadge={false} />}</View>}
                <View
                  style={{
                    maxWidth: '76%',
                    backgroundColor: mine ? colors.primary : theirBubble,
                    borderTopLeftRadius: !mine && !firstOfGroup ? small : big,
                    borderBottomLeftRadius: !mine && !lastOfGroup ? small : !mine ? small : big,
                    borderTopRightRadius: mine && !firstOfGroup ? small : big,
                    borderBottomRightRadius: mine ? small : big,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderWidth: mine || dark ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <T size={15} color={mine ? colors.onPrimary : colors.text}>{m.text}</T>
                </View>
              </View>
            </View>
          );
        })}
        {typing && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 10 }}>
            <Avatar person={f} stage={f.stage} size={30} frame="none" petBadge={false} />
            <View style={{ backgroundColor: theirBubble, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: dark ? 0 : 1, borderColor: colors.border }}>
              <TypingDots color={colors.textMuted} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: insets.bottom + spacing.sm }}>
        {error && <T size={12} color={colors.danger} style={{ marginBottom: 4 }}>{error}</T>}
        {messages.length < 6 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
            {QUICK.map((q) => (
              <Pressable key={q} onPress={() => send(q)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
                <T size={13} weight="600">{q}</T>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: colors.card, borderRadius: 24, padding: 5, borderWidth: 1, borderColor: colors.border }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${f.name}`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            style={{ flex: 1, minWidth: 0, color: colors.text, fontSize: 15, ...font('500'), maxHeight: 110, paddingVertical: 9, paddingHorizontal: 10 }}
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
          <PressScale
            accessibilityLabel="Send"
            onPress={() => send()}
            disabled={!text.trim()}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: text.trim() ? colors.primary : colors.track, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-up" size={19} color={text.trim() ? colors.onPrimary : colors.textMuted} />
          </PressScale>
        </View>
        {f.streak && f.streak >= 7 && !messages.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
            <Flame size={11} />
            <T size={11} muted>{f.name} is on a {f.streak}-day streak</T>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
