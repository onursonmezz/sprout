import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { pickFromCamera } from '@/utils/photos';

/** Opened by the "Identify" shortcut widget: goes straight to the camera, then
 * on to the scan result. Cancelling returns to wherever the app was. */
export default function QuickScanScreen() {
  const colors = useTheme();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let uri: string | null = null;
      try {
        uri = await pickFromCamera();
      } catch {
        // A refused permission or a failed camera simply leads back.
      }
      if (uri) router.replace({ pathname: '/scan', params: { uri } });
      else if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
