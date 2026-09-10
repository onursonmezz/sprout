import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { loadJSON, saveJSON } from '@/utils/storage';

const STORAGE_KEY = 'sprout:settings';

type Units = 'metric' | 'imperial';

type PersistedSettings = {
  onboarded: boolean;
  notificationsEnabled: boolean;
  reminderTime: string;
  quietStart: string;
  quietEnd: string;
  seasonalAdjustment: boolean;
  vacationMode: boolean;
  vacationStart: string | null;
  vacationEnd: string | null;
  units: Units;
};

function timeAt(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const defaults: PersistedSettings = {
  onboarded: false,
  notificationsEnabled: true,
  reminderTime: timeAt(8, 0).toISOString(),
  quietStart: timeAt(22, 0).toISOString(),
  quietEnd: timeAt(7, 0).toISOString(),
  seasonalAdjustment: true,
  vacationMode: false,
  vacationStart: null,
  vacationEnd: null,
  units: 'metric',
};

type SettingsContextValue = {
  loaded: boolean;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  reminderTime: Date;
  setReminderTime: (d: Date) => void;
  quietStart: Date;
  setQuietStart: (d: Date) => void;
  quietEnd: Date;
  setQuietEnd: (d: Date) => void;
  seasonalAdjustment: boolean;
  setSeasonalAdjustment: (v: boolean) => void;
  vacationMode: boolean;
  setVacationMode: (v: boolean) => void;
  vacationStart: Date | null;
  setVacationStart: (d: Date | null) => void;
  vacationEnd: Date | null;
  setVacationEnd: (d: Date | null) => void;
  units: Units;
  setUnits: (u: Units) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PersistedSettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<PersistedSettings>(STORAGE_KEY, defaults).then((saved) => {
      setSettings(saved);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveJSON(STORAGE_KEY, settings);
  }, [settings, loaded]);

  const update = <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <SettingsContext.Provider
      value={{
        loaded,
        onboarded: settings.onboarded,
        setOnboarded: (v) => update('onboarded', v),
        notificationsEnabled: settings.notificationsEnabled,
        setNotificationsEnabled: (v) => update('notificationsEnabled', v),
        reminderTime: new Date(settings.reminderTime),
        setReminderTime: (d) => update('reminderTime', d.toISOString()),
        quietStart: new Date(settings.quietStart),
        setQuietStart: (d) => update('quietStart', d.toISOString()),
        quietEnd: new Date(settings.quietEnd),
        setQuietEnd: (d) => update('quietEnd', d.toISOString()),
        seasonalAdjustment: settings.seasonalAdjustment,
        setSeasonalAdjustment: (v) => update('seasonalAdjustment', v),
        vacationMode: settings.vacationMode,
        setVacationMode: (v) => update('vacationMode', v),
        vacationStart: settings.vacationStart ? new Date(settings.vacationStart) : null,
        setVacationStart: (d) => update('vacationStart', d ? d.toISOString() : null),
        vacationEnd: settings.vacationEnd ? new Date(settings.vacationEnd) : null,
        setVacationEnd: (d) => update('vacationEnd', d ? d.toISOString() : null),
        units: settings.units,
        setUnits: (u) => update('units', u),
      }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
