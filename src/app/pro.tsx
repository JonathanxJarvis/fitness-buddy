import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconButton, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Kettle, PETS, SKINS } from '@/components/Mascot';

const PRO_PETS = PETS.filter((p) => p.source === 'pro');
import { useStore } from '@/store/StoreProvider';
import { isPro, PLANS, PREVIEW, PRO_EXTRAS, PRO_HEADLINES } from '@/lib/pro';
import { radius, spacing } from '@/theme';

const GOLD = '#FFD66B';
const INK = '#0B120E';

const REASON: Record<string, string> = {
  snap: 'Snap a meal is a Pro feature',
  coach: 'The AI coach is a Pro feature',
  friends: 'Your friends list is full',
  skins: 'Outfits are a Pro feature',
  pets: 'That pet comes with Pro',
  progression: 'Smart progression is a Pro feature',
  stats: 'Deep stats are a Pro feature',
  recovery: 'The recovery map is a Pro feature',
  mealplan: 'Meal plans are a Pro feature',
};

export default function ProScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const pro = isPro(state);
  const [plan, setPlan] = useState<string>('yearly');
  const [note, setNote] = useState<string | null>(null);
  const [skin, setSkin] = useState(0);
  const skins = Object.keys(SKINS).filter((k) => SKINS[k].source === 'pro');

  const buy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (__DEV__) {
      // Development builds can unlock Pro to test it; store builds use the App Store.
      dispatch({ type: 'updateSettings', settings: { pro: true } });
      setNote('Pro unlocked on this device (development build).');
      return;
    }
    setNote('Subscriptions open when the app launches on the App Store.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1A3B2B', INK]} style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <IconButton label="Close" icon="close" color="#fff" onPress={() => router.back()} />
          </View>
          <FadeIn style={{ alignItems: 'center' }}>
            <Pressable onPress={() => setSkin((s) => s + 1)} accessibilityLabel="Show another pet">
              <Kettle species={PRO_PETS[skin % PRO_PETS.length].key} size={110} mood="proud" band={GOLD} skin={skins[skin % skins.length]} />
            </Pressable>
            <T size={11} color="rgba(255,255,255,0.5)" style={{ marginTop: 2 }}>Tap to meet the Pro pets</T>
            {feature && REASON[feature] ? (
              <T size={13} weight="700" color={GOLD} style={{ marginTop: spacing.md }}>{REASON[feature]}</T>
            ) : null}
            <T size={30} weight="800" color="#fff" center style={{ marginTop: 6 }}>
              Fitness Buddy <T size={30} weight="800" color={GOLD}>Pro</T>
            </T>
            <T size={14} color="rgba(255,255,255,0.7)" center style={{ marginTop: 6, maxWidth: 300 }}>
              Subscribe to Pro for the full experience.
            </T>
          </FadeIn>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <FadeIn delay={80} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {PRO_HEADLINES.map((f) => (
              <View key={f.title} style={{ width: '48%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,214,107,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon as never} size={17} color={GOLD} />
                </View>
                <View>
                  <T weight="800" color="#fff" numberOfLines={1}>{f.title}</T>
                  <T size={12} color="rgba(255,255,255,0.6)" numberOfLines={1}>{f.line}</T>
                </View>
              </View>
            ))}
          </FadeIn>

          <FadeIn delay={140} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {PRO_EXTRAS.map((x) => (
              <View key={x.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <Ionicons name={x.icon as never} size={13} color={GOLD} />
                <T size={12} weight="700" color="rgba(255,255,255,0.8)">{x.label}</T>
              </View>
            ))}
          </FadeIn>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xs }}>
            <Ionicons name="heart" size={13} color="rgba(255,255,255,0.5)" />
            <T size={12} color="rgba(255,255,255,0.5)">Support a growing app. No ads, no selling your data.</T>
          </View>

          {!pro && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              {PLANS.map((p) => {
                const on = plan === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPlan(p.id)}
                    style={{ flex: 1, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: on ? GOLD : 'rgba(255,255,255,0.12)', backgroundColor: on ? 'rgba(255,214,107,0.08)' : 'transparent' }}
                  >
                    {p.best && (
                      <View style={{ position: 'absolute', top: -10, right: 10, backgroundColor: GOLD, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <T size={10} weight="800" color={INK}>BEST VALUE</T>
                      </View>
                    )}
                    <T size={13} weight="700" color="rgba(255,255,255,0.7)">{p.label}</T>
                    <T size={22} weight="800" color="#fff">
                      {p.price}
                      <T size={12} color="rgba(255,255,255,0.6)"> {p.per}</T>
                    </T>
                    <T size={11} color="rgba(255,255,255,0.55)">{p.note}</T>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, backgroundColor: INK }}>
        {pro ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={20} color={GOLD} />
              <T weight="800" color="#fff">{PREVIEW ? 'Pro is unlocked in this preview' : 'You’re Pro. Thank you!'}</T>
            </View>
            <T size={12} color="rgba(255,255,255,0.6)">Every feature above is on.</T>
          </View>
        ) : (
          <>
            <PressScale onPress={buy}>
              <LinearGradient colors={['#FFE08F', '#E9B53A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' }}>
                <T weight="800" size={16} color={INK}>{plan === 'yearly' ? 'Start 7-day free trial' : 'Get Pro monthly'}</T>
              </LinearGradient>
            </PressScale>
            <T size={11} color="rgba(255,255,255,0.5)" center style={{ marginTop: 8 }}>
              {note ?? 'Billed through your App Store account. Cancel anytime in Settings.'}
            </T>
          </>
        )}
      </View>
    </View>
  );
}
