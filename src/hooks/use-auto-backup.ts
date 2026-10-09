import { useEffect, useRef } from 'react';

import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { firebaseConfigured, uploadBackup } from '@/utils/backup';

/** How long the plant list has to stay unchanged before it is uploaded, so a
 * burst of edits becomes one backup instead of many. */
const QUIET_PERIOD_MS = 20000;

/**
 * Keeps the cloud backup current by itself once the user has made a first
 * backup (which is what creates their backup code). Without that code nothing
 * is uploaded — backing up stays the user's own choice. Failures are silent:
 * the next change simply tries again, and the manual button in Settings still
 * reports errors.
 */
export function useAutoBackup() {
  const { plants, loaded: plantsLoaded } = usePlants();
  const { backupCode, setLastBackupAt, loaded: settingsLoaded } = useSettings();
  const firstRun = useRef(true);

  useEffect(() => {
    if (!plantsLoaded || !settingsLoaded || !backupCode || !firebaseConfigured) return;
    // Opening the app is not a change worth uploading.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      if (await uploadBackup(backupCode, plants)) setLastBackupAt(new Date());
    }, QUIET_PERIOD_MS);
    return () => clearTimeout(timer);
    // setLastBackupAt is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants, plantsLoaded, settingsLoaded, backupCode]);
}
