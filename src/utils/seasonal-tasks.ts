import { Plant } from '@/data/plants';
import { daysUntilNext, speciesOf } from '@/utils/care';

/** One day of the local forecast, as stored in settings. */
export type ForecastDay = { date: string; minC: number; maxC: number };

export type MonthlyTaskKind =
  | 'fertilizeStart'
  | 'fertilizeStop'
  | 'bringIn'
  | 'takeOut'
  | 'heating'
  | 'repotSeason'
  | 'coldWindow'
  | 'vacation'
  | 'dust';

/** A task for this month. `plants` names the plants it is about (empty for
 * general ones); the wording lives in translations. */
export type MonthlyTask = { kind: MonthlyTaskKind; plants: string[] };

/** Survival temperature assumed for a plant whose species is unknown. */
const UNKNOWN_SURVIVAL_MIN_C = 5;
/** Plants are brought in a little before their limit, not at it. */
const COLD_MARGIN_C = 2;
const HEAT_ALERT_C = 35;

/**
 * What is worth doing this month, from the user's own plants and the season
 * (northern-hemisphere calendar). Plant-specific tasks only appear when some
 * plant actually needs them, so the list stays short and never generic filler
 * beyond one or two all-year basics.
 */
export function monthlyTasks(plants: Plant[], date: Date, heatingOn: boolean): MonthlyTask[] {
  const month = date.getMonth() + 1;
  const tasks: MonthlyTask[] = [];
  const add = (kind: MonthlyTaskKind, matching: Plant[], always = false) => {
    if (matching.length > 0 || always) tasks.push({ kind, plants: matching.map((p) => p.name) });
  };

  add(
    'fertilizeStart',
    plants.filter((p) => speciesOf(p)?.fertilize.months[0] === month)
  );
  add(
    'fertilizeStop',
    plants.filter((p) => {
      const months = speciesOf(p)?.fertilize.months ?? [];
      return months.length > 0 && (months[months.length - 1] % 12) + 1 === month;
    })
  );
  if (month === 10 || month === 11) {
    add(
      'bringIn',
      plants.filter((p) => !p.indoor && (speciesOf(p)?.temperature.survivalMinC ?? UNKNOWN_SURVIVAL_MIN_C) > 0)
    );
  }
  if (month === 4 || month === 5) {
    add(
      'takeOut',
      plants.filter((p) => p.indoor && speciesOf(p)?.category === 'outdoor')
    );
  }
  if (heatingOn && (month >= 10 || month <= 2)) {
    add(
      'heating',
      plants.filter((p) => p.indoor && p.heatingSensitivity === 'high')
    );
  }
  if (month === 3 || month === 4) {
    add(
      'repotSeason',
      plants.filter((p) => p.care.some((c) => c.type === 'repot' && daysUntilNext(c.intervalDays, c.lastDoneDaysAgo) <= 60))
    );
  }
  if (plants.length > 0) {
    if (month === 12 || month <= 2) add('coldWindow', [], true);
    if (month === 7 || month === 8) add('vacation', [], true);
    add('dust', [], true);
  }
  return tasks;
}

/** Stable id for remembering that a task was ticked off this month. */
export const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export type TemperatureAlert = {
  kind: 'cold' | 'heat';
  /** 0 = today / tonight, 1 = tomorrow, ... */
  dayOffset: number;
  tempC: number;
  plants: string[];
};

const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Warnings for outdoor plants from the forecast: a night colder than a plant
 * can take (with a small margin), or a very hot day. Only today and the next
 * days are considered, and at most one alert per day — cold wins over heat.
 */
export function temperatureAlerts(plants: Plant[], forecast: ForecastDay[], today: Date = new Date()): TemperatureAlert[] {
  const outdoor = plants.filter((p) => !p.indoor);
  if (outdoor.length === 0) return [];
  const alerts: TemperatureAlert[] = [];
  for (const day of forecast) {
    const [y, m, d] = day.date.split('-').map(Number);
    if (!y || !m || !d) continue;
    const dayOffset = Math.round((Date.UTC(y, m - 1, d) - dayNumber(today)) / 86400000);
    if (dayOffset < 0 || dayOffset > 2) continue;
    const tooCold = outdoor.filter((p) => day.minC < (speciesOf(p)?.temperature.survivalMinC ?? UNKNOWN_SURVIVAL_MIN_C) + COLD_MARGIN_C);
    if (tooCold.length > 0) {
      alerts.push({ kind: 'cold', dayOffset, tempC: Math.round(day.minC), plants: tooCold.map((p) => p.name) });
    } else if (day.maxC >= HEAT_ALERT_C) {
      alerts.push({ kind: 'heat', dayOffset, tempC: Math.round(day.maxC), plants: outdoor.map((p) => p.name) });
    }
  }
  return alerts.sort((a, b) => a.dayOffset - b.dayOffset);
}

/** A growth photo is suggested about once a month. */
export const PHOTO_INTERVAL_DAYS = 30;

/** Days since the plant's last journal photo, or since it was added if it has none. */
export function daysSinceLastPhoto(plant: Plant): number {
  let latest: number | null = null;
  for (const entry of plant.journalNotes) {
    if (entry.photoUri && (latest === null || entry.daysAgo < latest)) latest = entry.daysAgo;
  }
  return latest ?? plant.createdDaysAgo;
}

export const photoDue = (plant: Plant) => daysSinceLastPhoto(plant) >= PHOTO_INTERVAL_DAYS;
