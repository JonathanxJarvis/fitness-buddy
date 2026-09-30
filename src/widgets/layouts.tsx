// iOS home screen widget + workout Live Activity, rendered by expo-widgets with SwiftUI (@expo/ui).
//
// Only loaded on iOS in an installed build (see src/lib/nativeWidgets.ios.ts), never in Expo Go or on web.
// The 'widget' directive makes Babel turn each function into a string that the widget extension
// evaluates on its own, so these functions can only use their props, the environment argument,
// plain JavaScript and the @expo/ui components/modifiers. They must not call helpers from this file.
import { Gauge, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  containerBackground,
  font,
  foregroundStyle,
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, createWidget, type LiveActivityEnvironment, type WidgetEnvironment } from 'expo-widgets';
import type { CalorieWidgetProps, WorkoutActivityProps } from '@/lib/widgetData';

/** Must match the widget `name` in the expo-widgets plugin config in app.json. */
export const CALORIE_WIDGET_NAME = 'CalorieWidget';
export const WORKOUT_ACTIVITY_NAME = 'WorkoutActivity';

const CalorieWidget = (props: CalorieWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const green = '#2E7D32';
  const over = props.left < 0;
  const leftText = `${Math.abs(props.left).toLocaleString('en-US')}`;
  const leftLabel = over ? 'kcal over' : 'kcal left';
  const proteinText = `${props.protein}/${props.proteinGoal} g protein`;
  // iOS 17+ requires a container background on every widget.
  const accessory = env.widgetFamily === 'accessoryRectangular' || env.widgetFamily === 'accessoryCircular' || env.widgetFamily === 'accessoryInline';
  const bg = containerBackground(accessory ? 'clear' : env.colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF', 'widget');

  if (!props.ready) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[widgetURL(props.url), bg]}>
        <Text modifiers={[font({ size: 15, weight: 'bold' })]}>Track your calories</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.nudge}</Text>
      </VStack>
    );
  }

  if (env.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(props.url), bg]}>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), monospacedDigit()]}>{`${leftText} ${leftLabel}`}</Text>
        <Text modifiers={[font({ size: 12 })]}>{proteinText}</Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>{props.cta}</Text>
      </VStack>
    );
  }

  if (env.widgetFamily === 'accessoryCircular') {
    return (
      <Gauge value={props.progress} modifiers={[gaugeStyle('circularCapacity'), widgetURL(props.url), bg]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), minimumScaleFactor(0.5)]}>{leftText}</Text>
      </Gauge>
    );
  }

  const header = (
    <HStack spacing={4}>
      <Image systemName="flame.fill" color={green} size={13} />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(green)]}>Calories</Text>
      <Spacer />
    </HStack>
  );
  const big = (
    <VStack alignment="leading" spacing={0}>
      <Text modifiers={[font({ size: 30, weight: 'bold', design: 'rounded' }), monospacedDigit(), minimumScaleFactor(0.6), foregroundStyle(over ? 'orange' : 'primary')]}>
        {leftText}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
        {`${leftLabel} · ${props.eaten.toLocaleString('en-US')} of ${props.budget.toLocaleString('en-US')}`}
      </Text>
    </VStack>
  );
  const bar = <ProgressView value={props.progress} modifiers={[tint(over ? 'orange' : green)]} />;
  const nudge = (
    <HStack spacing={4}>
      <Image systemName="plus.circle.fill" color={green} size={13} />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.8)]}>{props.cta}</Text>
    </HStack>
  );

  if (env.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={16} modifiers={[widgetURL(props.url), bg]}>
        <VStack alignment="leading" spacing={6}>
          {header}
          {big}
          {bar}
        </VStack>
        <VStack alignment="leading" spacing={8}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>Protein</Text>
          <Text modifiers={[font({ size: 20, weight: 'bold', design: 'rounded' }), monospacedDigit()]}>{`${props.protein} g`}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{`of ${props.proteinGoal} g`}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 12 }), lineLimit(2), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.nudge}</Text>
          {nudge}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={[widgetURL(props.url), bg]}>
      {header}
      {big}
      {bar}
      <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{proteinText}</Text>
      <Spacer />
      {nudge}
    </VStack>
  );
};

const WorkoutActivity = (props: WorkoutActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const green = '#43A047';
  const resting = props.restEndsAt > 0 && !env.isStale;
  const started = new Date(props.startedAt);
  const restRange = { lower: new Date(props.restStartedAt || Date.now()), upper: new Date(props.restEndsAt || Date.now()) };
  const muted = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

  const elapsed = <Text date={started} dateStyle="timer" modifiers={[font({ size: 17, weight: 'bold', design: 'rounded' }), monospacedDigit()]} />;
  const restTimer = (
    <Text timerInterval={restRange} countsDown modifiers={[font({ size: 17, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle('orange')]} />
  );
  const nextLine = props.next ? `Next: ${props.next}` : 'Last exercise';

  return {
    banner: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 14 }), activityBackgroundTint('#111814')]}>
        <HStack spacing={6}>
          <Image systemName="dumbbell.fill" color={green} size={14} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(green), lineLimit(1)]}>{props.name}</Text>
          <Spacer />
          {elapsed}
        </HStack>
        <HStack spacing={8}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle('white'), lineLimit(1)]}>{props.current}</Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle('gray'), lineLimit(1)]}>{`${props.currentDetail} · ${nextLine}`}</Text>
          </VStack>
          <Spacer />
          {resting ? (
            <VStack alignment="trailing" spacing={0}>
              <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('orange')]}>REST</Text>
              {restTimer}
            </VStack>
          ) : (
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('gray')]}>{`${props.setsDone}/${props.setsTotal} sets`}</Text>
          )}
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName="dumbbell.fill" color={green} size={14} />,
    compactTrailing: resting ? restTimer : elapsed,
    minimal: <Image systemName={resting ? 'timer' : 'dumbbell.fill'} color={resting ? 'orange' : green} size={13} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 6 })]}>
        <Text modifiers={[font({ size: 12 }), muted]}>Elapsed</Text>
        {elapsed}
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 6 })]}>
        <Text modifiers={[font({ size: 12 }), resting ? foregroundStyle('orange') : muted]}>{resting ? 'Rest' : 'Sets'}</Text>
        {resting ? restTimer : <Text modifiers={[font({ size: 17, weight: 'bold', design: 'rounded' })]}>{`${props.setsDone}/${props.setsTotal}`}</Text>}
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ horizontal: 6 })]}>
        <Text modifiers={[font({ size: 16, weight: 'bold' }), lineLimit(1)]}>{`${props.current} · ${props.currentDetail}`}</Text>
        <Text modifiers={[font({ size: 13 }), muted, lineLimit(1)]}>{nextLine}</Text>
      </VStack>
    ),
  };
};

export const calorieWidget = createWidget<CalorieWidgetProps>(CALORIE_WIDGET_NAME, CalorieWidget);
export const workoutActivity = createLiveActivity<WorkoutActivityProps>(WORKOUT_ACTIVITY_NAME, WorkoutActivity);
