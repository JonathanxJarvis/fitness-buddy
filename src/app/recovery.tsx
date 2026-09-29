import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Screen, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { ProMark } from '@/components/ProMark';
import { ProPreview } from '@/components/stats/ProPreview';
import { RecoveryBody, RecoveryLegend, SAMPLE_RECOVERY, recoveryColors, recoveryInk } from '@/components/recovery/RecoveryMap';
import { useRecoveryToday } from '@/components/recovery/useRecoveryToday';
import { Dropdown } from '@/components/Dropdown';
import { useStore } from '@/store/StoreProvider';
import { isPro } from '@/lib/pro';
import { prettyDate, toKey } from '@/lib/dates';
import { REGION_LABEL, type MuscleRegion } from '@/lib/exerciseInfo';
import { ALL_REGIONS, isAre, readyLabel, regionList, STATE_LABEL, THRESHOLDS } from '@/lib/recovery';
import { useStartWorkout } from '@/lib/useStartWorkout';
import { radius, spacing, useTheme } from '@/theme';

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <T size={11} weight="800" muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
    {children}
  </T>
);

export default function RecoveryScreen() {
  const { state } = useStore();
  const { colors, dark } = useTheme();
  const { rec, ranked, planned, restDay, counts, anyRecent } = useRecoveryToday();
  const start = useStartWorkout();

  if (!isPro(state)) {
    return (
      <Screen>
        <Card>
          <ProPreview
            feature="recovery"
            title="Recovery map"
            body="A body map showing which muscles are fresh or still tired, so you know what to train today."
          >
            <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
              <RecoveryBody rec={SAMPLE_RECOVERY} size={240} />
            </View>
          </ProPreview>
        </Card>
      </Screen>
    );
  }

  const tint = recoveryColors(colors, dark);
  const ink = recoveryInk(colors);
  const sore = ALL_REGIONS.map((r) => rec[r]).filter((r) => r.state !== 'fresh').sort((a, b) => b.fatigue - a.fatigue);
  const fresh = ALL_REGIONS.filter((r) => rec[r].state === 'fresh');
  const tired = sore.filter((r) => r.state === 'tired').map((r) => r.region);

  const headline = !anyRecent ? 'Everything is fresh' : sore.length ? `${fresh.length} of ${ALL_REGIONS.length} muscles ready` : 'Fully recovered';
  const sub = !anyRecent
    ? 'No training in the last three days, so every muscle is ready to go.'
    : tired.length
      ? `${regionList(tired)} ${isAre(tired)} still tired. Train around ${isAre(tired) === 'is' ? 'it' : 'them'} today.`
      : sore.length
        ? `${regionList(sore.map((r) => r.region))} ${isAre(sore.map((r) => r.region))} nearly there.`
        : 'Your last sessions have worn off. Train whatever you like.';

  const best = ranked[0];
  const others = ranked.slice(1, 3);

  return (
    <Screen>
      <FadeIn>
        <Card style={{ alignItems: 'center', paddingTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Eyebrow>Recovery map</Eyebrow>
            <ProMark size={12} />
          </View>
          <T size={24} weight="800" center style={{ marginTop: 6 }}>{headline}</T>
          <T muted size={14} center style={{ marginTop: 4, maxWidth: 300 }}>{sub}</T>
          <View style={{ marginVertical: spacing.lg }}>
            <RecoveryBody rec={rec} size={300} />
          </View>
          <RecoveryLegend counts={counts} />
        </Card>
      </FadeIn>

      {best && (
        <FadeIn delay={80}>
          <Card>
            <Eyebrow>Best fit today</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <T size={22} weight="800" style={{ flex: 1 }} numberOfLines={1}>{best.session.name}</T>
              <FitPill score={best.score} />
            </View>
            <T muted size={14} style={{ marginTop: 4 }}>
              {best.freshHits.length ? `Works ${regionList(best.freshHits).toLowerCase()}, all rested.` : 'A light fit for today.'}
              {best.tiredHits.length ? ` Heads up: ${regionList(best.tiredHits).toLowerCase()} ${isAre(best.tiredHits)} still tired.` : ''}
            </T>
            {planned && planned.candidate.id !== best.candidate.id ? (
              <View style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.cardAlt }}>
                <T size={13}>
                  <T size={13} weight="700">Your plan says {planned.session.name}</T>
                  <T size={13} muted>
                    {planned.tiredHits.length
                      ? ` today, but ${regionList(planned.tiredHits).toLowerCase()} ${isAre(planned.tiredHits)} still tired. Swapping is fine; the week evens out.`
                      : ` today and it fits too (${planned.score}% fresh).`}
                  </T>
                </T>
              </View>
            ) : planned ? (
              <T size={13} muted style={{ marginTop: spacing.sm }}>It’s also what your plan says for today.</T>
            ) : restDay ? (
              <T size={13} muted style={{ marginTop: spacing.sm }}>Your plan has a rest day today. Resting is how muscles grow, so this is only if you feel like it.</T>
            ) : null}
            <Button title={`Start ${best.session.name}`} icon="play" onPress={() => start(best.session.routine)} style={{ marginTop: spacing.md }} />
            {others.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <T size={12} weight="700" muted style={{ marginBottom: 2 }}>Other options</T>
                {others.map((f) => (
                  <PressScale
                    key={f.candidate.id}
                    onPress={() => start(f.session.routine)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${f.session.name}, ${f.score}% fresh`}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.border }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: f.session.color }} />
                    <View style={{ flex: 1 }}>
                      <T weight="700" numberOfLines={1}>{f.session.name}</T>
                      <T size={12} muted numberOfLines={1}>
                        {f.tiredHits.length ? `${regionList(f.tiredHits)} still tired` : f.freshHits.length ? regionList(f.freshHits) : 'Light session'}
                      </T>
                    </View>
                    <FitPill score={f.score} small />
                  </PressScale>
                ))}
              </View>
            )}
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={140} style={{ gap: spacing.sm }}>
        <Dropdown title="Needs rest" dot={tint.tired} summary={sore.length ? `${sore.length} muscle${sore.length === 1 ? '' : 's'}` : 'None'}>
          {sore.length === 0 ? (
            <T muted size={14}>Nothing needs rest right now.</T>
          ) : (
            sore.map((r, i) => (
              <View key={r.region} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tint[r.state] }} />
                <View style={{ flex: 1 }}>
                  <T weight="700">{REGION_LABEL[r.region]}</T>
                  <T size={12} muted>
                    {r.lastTrained ? `${trainedWhen(r.lastTrained)} · ` : ''}
                    {readyLabel(r.readyInHours).replace(/^Ready/, 'ready')}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge label={STATE_LABEL[r.state]} color={ink[r.state]} />
                  <FatigueMeter value={r.fatigue} color={ink[r.state]} />
                </View>
              </View>
            ))
          )}
        </Dropdown>
        <Dropdown title="Ready to train" dot={tint.fresh} summary={`${fresh.length} muscle${fresh.length === 1 ? '' : 's'}`}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {fresh.map((r: MuscleRegion) => (
              <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.cardAlt }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tint.fresh }} />
                <T size={13} weight="600">{REGION_LABEL[r]}</T>
              </View>
            ))}
          </View>
        </Dropdown>
      </FadeIn>

      <T muted size={12} center style={{ marginTop: spacing.sm, paddingHorizontal: spacing.lg, lineHeight: 17 }}>
        Big muscles recover in about 3 days, arms in 2, small ones in 1½. It’s a guide: how you feel wins.
      </T>
    </Screen>
  );
}

/** "Today", "Yesterday", "Mon". */
function trainedWhen(ts: number): string {
  const p = prettyDate(toKey(new Date(ts)));
  return p === 'Today' || p === 'Yesterday' ? p : p.split(',')[0];
}

function FitPill({ score, small }: { score: number; small?: boolean }) {
  const { colors } = useTheme();
  const c = score >= 75 ? colors.success : score >= 45 ? colors.warning : colors.danger;
  return (
    <View style={{ paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 3 : 5, borderRadius: radius.pill, backgroundColor: c + '1F' }}>
      <T size={small ? 11 : 12} weight="800" color={c}>{score}% fresh</T>
    </View>
  );
}

/** A small five-step meter of how much fatigue is left. */
function FatigueMeter({ value, color }: { value: number; color: string }) {
  const { colors } = useTheme();
  const steps = 5;
  const filled = Math.min(steps, Math.max(1, Math.ceil((value / (THRESHOLDS.tired * 1.6)) * steps)));
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityElementsHidden>
      {Array.from({ length: steps }, (_, i) => (
        <View key={i} style={{ width: 4, height: 12, borderRadius: 2, backgroundColor: i < filled ? color : colors.track }} />
      ))}
    </View>
  );
}
