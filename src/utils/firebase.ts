import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig, firebaseConfigured } from './firebase-config';

const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

export const db = app ? getFirestore(app) : null;
export { firebaseConfigured };
