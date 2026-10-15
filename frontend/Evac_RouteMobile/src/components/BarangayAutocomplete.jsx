import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { MapPin, ChevronDown, Check } from 'lucide-react-native';
import { radii } from '../styles/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

export const ZAMBOANGA_BARANGAYS = [
  'Arena Blanco',
  'Ayala',
  'Baliwasan',
  'Boalan',
  'Bolong',
  'Buenavista',
  'Bunguiao',
  'Cabaluay',
  'Calarian',
  'Camino Nuevo',
  'Campo Islam',
  'Canelar',
  'Capisan',
  'Cawit',
  'Culianan',
  'Curuan',
  'Divisoria',
  'Dulian (Lower)',
  'Dulian (Upper)',
  'Guiwan',
  'Kasanyangan',
  'Labuan',
  'Licomo',
  'Lumbangan',
  'Lunzuran',
  'Maasin',
  'Malagutay',
  'Mampang',
  'Manicahan',
  'Mariki',
  'Mercedes',
  'Pamucutan',
  'Pasobolong',
  'Pasonanca',
  'Putik',
  'Quiniput',
  'Recodo',
  'Rio Hondo',
  'San Jose Cawa-Cawa',
  'San Jose Gusu',
  'San Roque',
  'Sangali',
  'Santa Maria',
  'Sibulao',
  'Sinunuc',
  'Sta. Barbara',
  'Sto. Niño',
  'Tagasilay',
  'Talon-Talon',
  'Tetuan',
  'Tictapul',
  'Tigtabon',
  'Tugbungan',
  'Tumaga',
  'Victoria',
  'Vitali',
  'Zone I (Poblacion)',
  'Zone II (Poblacion)',
  'Zone III (Poblacion)',
  'Zone IV (Poblacion)',
];

export default function BarangayAutocomplete({ value, onChangeText, placeholder = 'Search or type Barangay...' }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(getStyles);
  const [isOpen, setIsOpen] = useState(false);

  // Filter & prioritize barangays that START with the input query, then those that contain it
  const suggestions = useMemo(() => {
    if (!value || value.trim() === '') return ZAMBOANGA_BARANGAYS;

    const query = value.trim().toLowerCase();
    const startsWith = [];
    const contains = [];

    for (const item of ZAMBOANGA_BARANGAYS) {
      const lower = item.toLowerCase();
      if (lower.startsWith(query)) {
        startsWith.push(item);
      } else if (lower.includes(query)) {
        contains.push(item);
      }
    }

    return [...startsWith, ...contains];
  }, [value]);

  const handleSelect = (selectedBarangay) => {
    Keyboard.dismiss();
    onChangeText(selectedBarangay);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, isOpen && styles.inputWrapperFocused]}>
        <MapPin size={18} color={colors.primary} style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <TouchableOpacity style={styles.rightIconBtn} onPress={() => setIsOpen(!isOpen)}>
          <ChevronDown
            size={18}
            color={colors.textMuted}
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={styles.dropdownContainer}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            style={styles.dropdownScroll}
          >
            {suggestions.length > 0 ? (
              suggestions.map((item) => {
                const isSelected = value?.toLowerCase() === item.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{`Using custom input: "${value}"`}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    zIndex: 1000,
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  rightIconBtn: {
    padding: 6,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.md,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    zIndex: 9999,
  },
  dropdownScroll: {
    maxHeight: 218,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryGlow,
  },
  optionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyRow: {
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

