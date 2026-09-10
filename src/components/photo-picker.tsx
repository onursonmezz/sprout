import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { pickFromCamera, pickFromLibrary } from '@/utils/photos';

export function PhotoPicker({
  uri,
  onChange,
  colors,
  t,
  height = 190,
}: {
  uri: string | null;
  onChange: (uri: string | null) => void;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  height?: number;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCamera = async () => {
    setPanelOpen(false);
    const result = await pickFromCamera();
    if (result) onChange(result);
  };

  const handleLibrary = async () => {
    setPanelOpen(false);
    const result = await pickFromLibrary();
    if (result) onChange(result);
  };

  return (
    <View>
      <Pressable
        onPress={() => setPanelOpen((o) => !o)}
        style={[styles.box, { height, backgroundColor: colors.tintMuted }]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons name="camera-outline" size={32} color={colors.tint} />
        )}
        <View style={styles.overlayWrap}>
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>{uri ? t.addPlant.changePhoto : t.addPlant.addPhoto}</Text>
          </View>
        </View>
      </Pressable>

      {panelOpen && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={handleCamera} style={styles.panelOption}>
            <Ionicons name="camera-outline" size={16} color={colors.text} />
            <Text style={[styles.panelOptionText, { color: colors.text }]}>{t.addPlant.takePhoto}</Text>
          </Pressable>
          <Pressable onPress={handleLibrary} style={styles.panelOption}>
            <Ionicons name="images-outline" size={16} color={colors.text} />
            <Text style={[styles.panelOptionText, { color: colors.text }]}>{t.addPlant.chooseFromLibrary}</Text>
          </Pressable>
          {uri && (
            <Pressable
              onPress={() => {
                setPanelOpen(false);
                onChange(null);
              }}
              style={styles.panelOption}>
              <Ionicons name="trash-outline" size={16} color={colors.accent} />
              <Text style={[styles.panelOptionText, { color: colors.accent }]}>{t.addPlant.removePhoto}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  overlayWrap: { position: 'absolute', bottom: 10, alignItems: 'center', width: '100%' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  overlayText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  panel: { marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 6, gap: 2 },
  panelOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 6 },
  panelOptionText: { fontSize: 13, fontWeight: '600' },
});
