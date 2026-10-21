import { useRouter } from 'expo-router';

/** "Back" that still works when the screen was opened straight from a
 * home-screen widget and has nothing underneath it: it then goes to Today. */
export function useGoBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
}
