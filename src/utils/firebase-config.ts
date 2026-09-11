/**
 * Fill these in with the values from your Firebase project's web app
 * config (Project settings → Your apps → the "</>" web app). These are
 * public client identifiers, not secrets — Firestore security rules are
 * what actually protect the data, not hiding this object.
 */
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export const firebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
