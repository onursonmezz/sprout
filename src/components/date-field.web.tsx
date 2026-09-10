import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  value: Date | null;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  displayText: string;
  textColor: string;
  backgroundColor: string;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function DateField({ value, mode, onChange, textColor, backgroundColor }: Props) {
  const inputValue = !value
    ? ''
    : mode === 'date'
      ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      : `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  const handleChange = (e: { target: { value: string } }) => {
    const raw = e.target.value;
    if (!raw) return;
    const base = value ?? new Date();
    const next = new Date(base);
    if (mode === 'date') {
      const [y, m, d] = raw.split('-').map(Number);
      next.setFullYear(y, m - 1, d);
    } else {
      const [h, min] = raw.split(':').map(Number);
      next.setHours(h, min, 0, 0);
    }
    onChange(next);
  };

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      {createElement('input', {
        type: mode,
        value: inputValue,
        onChange: handleChange,
        style: {
          border: 'none',
          background: 'transparent',
          color: textColor,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          outline: 'none',
          colorScheme: 'inherit',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
