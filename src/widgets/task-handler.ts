import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { loadWidgetData, setWidgetPlantId } from '@/widgets/data';
import { renderWidgetFor } from '@/widgets/render';

/** Runs when Android asks for a widget while Sprout itself may be closed:
 * added, timed refresh, resized or removed. Taps open links straight into
 * the app, so they never come here. */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') {
    if (widgetInfo.widgetName === 'Plant') await setWidgetPlantId(widgetInfo.widgetId, null);
    return;
  }
  if (widgetAction === 'WIDGET_CLICK') return;
  renderWidget(await renderWidgetFor(widgetInfo, await loadWidgetData()));
}
