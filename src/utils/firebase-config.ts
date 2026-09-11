/**
 * Fill these in with the values from your Firebase project's web app
 * config (Project settings → Your apps → the "</>" web app). These are
 * public client identifiers, not secrets — Firestore security rules are
 * what actually protect the data, not hiding this object.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyDgSIvGJlb_wy0Erwu8pEQzaa5FnTg3FY4',
  authDomain: 'sprout-app-d18ba.firebaseapp.com',
  projectId: 'sprout-app-d18ba',
  storageBucket: 'sprout-app-d18ba.firebasestorage.app',
  messagingSenderId: '693759210512',
  appId: '1:693759210512:web:85b11ba874441cdc6d0695',
};

export const firebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
