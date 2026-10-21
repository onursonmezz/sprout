import { Language } from '@/constants/translations';
import { daysBetween, fastForward, loadSeasonalOptions, migratePlant, PersistedState, STATE_KEY } from '@/context/plants-context';
import { Plant } from '@/data/plants';
import { loadJSON, saveJSON } from '@/utils/storage';

/** Which plant each "single plant" widget shows, by the widget's own id. */
const WIDGET_PLANTS_KEY = 'sprout:widget-plants';
const LANGUAGE_KEY = 'sprout:language';

export type WidgetData = { plants: Plant[]; lang: Language };

/**
 * The plants as the app would show them right now, read straight from
 * storage — for when the home screen asks for a widget while the app itself
 * is closed. Rolls the saved "days ago" fields forward the same way the app
 * does on launch.
 */
export async function loadWidgetData(): Promise<WidgetData> {
  const [state, lang] = await Promise.all([
    loadJSON<PersistedState | null>(STATE_KEY, null),
    loadJSON<Language>(LANGUAGE_KEY, 'en'),
  ]);
  const migrated = (state?.plants ?? []).map(migratePlant);
  const daysPassed = state ? Math.max(0, daysBetween(new Date(state.savedAt), new Date())) : 0;
  const options = await loadSeasonalOptions();
  return { plants: fastForward(migrated, daysPassed, options, new Date()), lang };
}

export async function widgetPlantId(widgetId: number): Promise<string | null> {
  const map = await loadJSON<Record<string, string>>(WIDGET_PLANTS_KEY, {});
  return map[String(widgetId)] ?? null;
}

export async function setWidgetPlantId(widgetId: number, plantId: string | null) {
  const map = await loadJSON<Record<string, string>>(WIDGET_PLANTS_KEY, {});
  if (plantId) map[String(widgetId)] = plantId;
  else delete map[String(widgetId)];
  await saveJSON(WIDGET_PLANTS_KEY, map);
}
