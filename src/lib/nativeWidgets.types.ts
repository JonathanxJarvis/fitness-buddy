import type { LiveActivityFactory, Widget } from 'expo-widgets';
import type { CalorieWidgetProps, WorkoutActivityProps } from './widgetData';

export interface NativeWidgets {
  calorieWidget: Widget<CalorieWidgetProps>;
  workoutActivity: LiveActivityFactory<WorkoutActivityProps>;
}
