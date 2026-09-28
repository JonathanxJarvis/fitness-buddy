import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReminderSettings } from './types';
import { parseTime } from './dates';

// Local, on-device reminders. These work in Expo Go (only remote push needs a dev build).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const MEAL_COPY = {
  breakfast: { title: 'Breakfast time 🍳', body: 'Log your breakfast to start the day on track.' },
  lunch: { title: 'Lunch check-in 🥗', body: 'What did you have for lunch? Log it while it’s fresh.' },
  dinner: { title: 'Dinner time 🍽️', body: 'Don’t forget to log dinner and see how your day adds up.' },
} as const;

/** Clears and re-creates all scheduled reminders from settings. Returns the count scheduled. */
export async function scheduleReminders(r: ReminderSettings): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!r.meals && !r.water) return 0;
  if (!(await ensurePermission())) return 0;

  const daily = (hour: number, minute: number) => ({
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
  }) as Notifications.DailyTriggerInput;

  let count = 0;
  if (r.meals) {
    for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
      const t = parseTime(r.mealTimes[meal]);
      if (!t) continue;
      await Notifications.scheduleNotificationAsync({ content: MEAL_COPY[meal], trigger: daily(t.hour, t.minute) });
      count++;
    }
  }
  if (r.water) {
    const every = Math.max(1, r.waterEveryHours);
    for (let h = r.waterStartHour; h <= r.waterEndHour; h += every) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Hydration break 💧', body: 'Time for a glass of water. Tap to log it.' },
        trigger: daily(h, 30),
      });
      count++;
    }
  }
  return count;
}
