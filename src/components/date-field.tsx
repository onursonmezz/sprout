import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: Date | null;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  displayText: string;
  textColor: string;
  backgroundColor: string;
  /** Disallows picking a date after this one — e.g. "last watered" can't be in the future. */
  maximumDate?: Date;
};

export function DateField({ value, mode, onChange, displayText, textColor, backgroundColor, maximumDate }: Props) {
  const [iosVisible, setIosVisible] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode,
        is24Hour: true,
        maximumDate,
        onChange: (_event, selected) => {
          if (selected) onChange(selected);
        },
      });
    } else {
      setIosVisible(true);
    }
  };

  return (
    <View>
      <Pressable onPress={open} style={[styles.pill, { backgroundColor }]}>
        <Text style={[styles.pillText, { color: textColor }]}>{displayText}</Text>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={13} color={textColor} />
      </Pressable>
      {Platform.OS === 'ios' && iosVisible && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          display="spinner"
          maximumDate={maximumDate}
          onChange={(_event, selected) => {
            setIosVisible(false);
            if (selected) onChange(selected);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
});
