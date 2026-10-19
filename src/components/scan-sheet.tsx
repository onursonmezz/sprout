import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { pickFromCamera, pickFromLibrary } from '@/utils/photos';

/** The panel that slides up from the middle button of the tab bar: take or
 * choose a photo to identify. Diagnosis will join it later; for now it is
 * shown greyed out as "soon". */
export function ScanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pick = async (from: () => Promise<string | null>) => {
    onClose();
    try {
      const uri = await from();
      if (uri) router.push({ pathname: '/scan', params: { uri } });
    } catch {
      // A cancelled or failed pick simply leaves the user where they were.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}>
        <View style={[styles.grab, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.text }]}>{t.scan.sheetTitle}</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>{t.scan.sheetSub}</Text>
        <Option icon="camera-outline" title={t.scan.camera} sub={t.scan.cameraSub} onPress={() => pick(pickFromCamera)} />
        <Option icon="images-outline" title={t.scan.library} sub={t.scan.librarySub} onPress={() => pick(pickFromLibrary)} />
        <Option icon="medkit-outline" title={t.scan.diagnose} sub={t.scan.diagnoseSub} soon={t.scan.soon} />
      </View>
    </Modal>
  );
}

function Option({
  icon,
  title,
  sub,
  onPress,
  soon,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress?: () => void;
  soon?: string;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.option, { backgroundColor: colors.glass, borderColor: colors.glassBorder, opacity: soon ? 0.45 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: colors.tintMuted }]}>
        <Ionicons name={icon} size={20} color={colors.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{sub}</Text>
      </View>
      {soon && (
        <Text style={[styles.soon, { color: colors.late, borderColor: colors.late }]}>{soon}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,9,7,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 9,
  },
  grab: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: -6, marginBottom: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionSub: { fontSize: 12.5 },
  soon: { fontSize: 10.5, fontWeight: '700', borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
});
