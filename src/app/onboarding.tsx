import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { onboarded, setOnboarded } = useSettings();
  const slides = t.onboarding.slides;
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  useEffect(() => {
    if (onboarded) router.replace('/(tabs)');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  const handlePrimary = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    finish();
    router.push('/add-plant');
  };

  const handleSecondary = () => {
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tintMuted }]}>
          <Text style={styles.iconEmoji}>{slide.emoji}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>

        {'noteTitle' in slide && (
          <View style={[styles.note, { backgroundColor: colors.tintMuted }]}>
            <Text style={[styles.noteTitle, { color: colors.text }]}>{slide.noteTitle}</Text>
            <Text style={[styles.noteBody, { color: colors.textSecondary }]}>{slide.noteBody}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.tint : colors.backgroundSelected },
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <Pressable onPress={handlePrimary} style={[styles.primaryButton, { backgroundColor: colors.tint }]}>
          <Text style={styles.primaryButtonText}>{slide.primary}</Text>
        </Pressable>

        {'secondary' in slide && (
          <Pressable onPress={handleSecondary} style={styles.secondaryButton}>
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{slide.secondary}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  iconWrap: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: 30, textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  note: { borderRadius: 16, padding: Spacing.three, gap: 4, marginTop: Spacing.two },
  noteTitle: { fontSize: 13, fontWeight: '700' },
  noteBody: { fontSize: 13, lineHeight: 19 },
  footer: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.four, gap: Spacing.three },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 20 },
  primaryButton: { borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: { alignItems: 'center', paddingVertical: 4 },
  secondaryButtonText: { fontSize: 14, fontWeight: '600' },
});
