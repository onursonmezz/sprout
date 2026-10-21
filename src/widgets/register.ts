import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import { WidgetConfigurationScreen } from '@/widgets/config-screen';
import { widgetTaskHandler } from '@/widgets/task-handler';

/** Home-screen widgets exist only on Android; register.web.ts is the web stand-in. */
export function registerWidgets() {
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigurationScreen);
}
