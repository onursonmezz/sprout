"use no memo";

import { requestWidgetUpdate, WidgetInfo } from 'react-native-android-widget';

import { translations } from '@/constants/translations';
import { WidgetData, widgetPlantId } from '@/widgets/data';
import { PlantWidget, ShortcutsWidget, TodayMediumWidget, TodaySmallWidget, WeekWidget } from '@/widgets/widgets';

/** Must match the names in app.json's react-native-android-widget plugin. */
export const WIDGET_NAMES = ['TodaySmall', 'TodayMedium', 'Plant', 'Week', 'Shortcuts'] as const;

export async function renderWidgetFor(info: WidgetInfo, data: WidgetData) {
  const t = translations[data.lang];
  switch (info.widgetName) {
    case 'TodayMedium':
      return <TodayMediumWidget plants={data.plants} t={t} height={info.height} />;
    case 'Plant': {
      const id = await widgetPlantId(info.widgetId);
      return <PlantWidget plant={data.plants.find((p) => p.id === id)} t={t} width={info.width} />;
    }
    case 'Week':
      return <WeekWidget plants={data.plants} t={t} width={info.width} />;
    case 'Shortcuts':
      return <ShortcutsWidget t={t} />;
    default:
      return <TodaySmallWidget plants={data.plants} t={t} />;
  }
}

/** Redraws every Sprout widget on the home screen with the given plants. */
export async function refreshAllWidgets(data: WidgetData) {
  for (const widgetName of WIDGET_NAMES) {
    try {
      await requestWidgetUpdate({ widgetName, renderWidget: (info) => renderWidgetFor(info, data) });
    } catch {
      // A widget that fails to draw keeps its last picture; the next refresh tries again.
    }
  }
}
