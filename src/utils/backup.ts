import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Plant } from '@/data/plants';
import { db, firebaseConfigured } from './firebase';

const COLLECTION = 'backups';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid transcription mistakes
const CODE_GROUPS = 4;
const CODE_GROUP_LENGTH = 4;

export { firebaseConfigured };

/** Not cryptographically secure, but long enough (16 chars from a 33-char
 * alphabet) that guessing one is not a realistic concern for a personal
 * backup code. */
export function generateBackupCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < CODE_GROUPS; g++) {
    let group = '';
    for (let i = 0; i < CODE_GROUP_LENGTH; i++) {
      group += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

export async function uploadBackup(code: string, plants: Plant[]): Promise<boolean> {
  if (!firebaseConfigured || !db) return false;
  try {
    await setDoc(doc(db, COLLECTION, code), {
      plants,
      savedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function downloadBackup(code: string): Promise<{ plants: Plant[]; savedAt: string } | null> {
  if (!firebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, code.trim().toUpperCase()));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!Array.isArray(data.plants) || typeof data.savedAt !== 'string') return null;
    return { plants: data.plants as Plant[], savedAt: data.savedAt };
  } catch {
    return null;
  }
}
