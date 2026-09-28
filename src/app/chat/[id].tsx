import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, T } from '@/components/ui';
import { PressScale, TypingDots } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { clockTime } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { DEMO, demoReplyText, fetchMessages, sendMessage } from '@/lib/social';
import { STAGES } from '@/lib/progression';
import { font, spacing, useTheme } from '@/theme';

const QUICK = ['💪', 'Trained today?', 'New PR!', 'Race you to the next rank'];

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
    if (DEMO || !me) return;
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.border }}>
        <IconButton label="Back" icon="chevron-back" color={colors.text} onPress={() => router.back()} />
        <Pressable onPress={() => router.push(`/friend/${f.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Avatar stage={f.stage} pet={f.pet} skin={f.skin} size={48} />
          <View style={{ flex: 1 }}>
            <T weight="800" size={16}>{f.name}</T>
            <T size={12} muted>
              {stage.label} · Lv {f.level}{f.streak ? ` · 🔥 ${f.streak}` : ''}
            </T>
          </View>
        </Pressable>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!messages.length && (
          <T muted center style={{ marginTop: spacing.xl }}>
            Say hi to {f.name}. Trash talk is encouraged. 💪
          </T>
        )}
        {messages.map((m, i) => {
          const mine = m.from === me.id;
          const gap = i === 0 || m.at - messages[i - 1].at > 30 * 60_000;
          return (
            <View key={m.id}>
              {gap && (
                <T size={11} muted center style={{ marginVertical: 6 }}>
                  {clockTime(m.at)}
                </T>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && (
                <View style={{ width: 34, opacity: messages[i + 1]?.from === m.from ? 0 : 1 }}>
                  <Avatar stage={f.stage} pet={f.pet} skin={f.skin} size={34} />
                </View>
              )}
              <View
                style={{
                  maxWidth: '78%',
                  backgroundColor: mine ? colors.primary : colors.card,
                  borderRadius: 18,
                  borderBottomRightRadius: mine ? 4 : 18,
                  borderBottomLeftRadius: mine ? 18 : 4,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  borderWidth: mine ? 0 : 1,
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
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
            <TypingDots color={stage.tier.color} />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: insets.bottom + spacing.sm }}>
        {error && <T size={12} color={colors.danger} style={{ marginBottom: 4 }}>{error}</T>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, marginBottom: 6 }} contentContainerStyle={{ gap: 6 }}>
          {QUICK.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.primarySoft }}>
              <T size={13} weight="700" color={colors.primary}>{q}</T>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: colors.card, borderRadius: 24, padding: 5, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: dark ? 0 : 0.05, shadowRadius: 10 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${f.name}…`}
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
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: text.trim() ? colors.ink : colors.track, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-up" size={19} color={text.trim() ? colors.onInk : colors.textMuted} />
          </PressScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
