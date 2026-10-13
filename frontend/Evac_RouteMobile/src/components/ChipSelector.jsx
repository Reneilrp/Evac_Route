import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, radii } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * ChipSelector — Animated chip row for selecting from a list of options.
 * 
 * Props:
 *   options (Array)            — Array of { value, label, icon? } or plain strings
 *   value (string)             — Currently selected value
 *   onChange (function)        — Called with the selected value
 *   colorMap (object)          — Optional map of value → color for active state
 *   activeColor (string)       — Default active color if no colorMap (default: primary)
 */
export default function ChipSelector({
  options = [],
  value,
  onChange,
  colorMap = null,
  activeColor = null,
}) {
  const { colors } = useTheme();
  const effectiveActiveColor = activeColor || colors.primaryDark;

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        const optIcon = typeof opt === 'object' ? opt.icon : null;
        const isActive = value === optValue;
        const chipColor = colorMap?.[optValue] || effectiveActiveColor;

        return (
          <TouchableOpacity
            key={optValue}
            onPress={() => onChange(optValue)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? chipColor : colors.surfaceElevated,
                borderColor: isActive ? chipColor : colors.border,
              },
            ]}
          >
            {optIcon && <View style={{ marginRight: spacing.xs }}>{optIcon}</View>}
            <Text
              style={[
                styles.chipText,
                { color: isActive ? colors.white : colors.textSecondary },
              ]}
            >
              {optLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii['2xl'],
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

