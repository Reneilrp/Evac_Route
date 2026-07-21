import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MapPin, ChevronDown, Check } from 'lucide-react-native';
import { colors, radii } from '../styles/theme';

export const ZAMBOANGA_BARANGAYS = [
  'Tetuan',
  'Tugbungan',
  'Baliwasan',
  'Guiwan',
  'Santa Maria',
  'Calarian',
  'Pasonanca',
  'Tumaga',
  'San Jose Gusu',
  'San Jose Cawa-Cawa',
  'Vitali',
  'Mercedes',
  'Putik',
  'Talon-Talon',
  'Divisoria',
  'Lunzuran',
  'Ayala',
  'Labuan',
  'Mampang',
  'Recodo',
  'Canelar',
  'Sto. Niño',
  'San Roque',
  'Cabaluay',
  'Sangali',
  'Curuan',
  'Manicahan',
  'Bolong',
  'Culianan',
  'Pasobolong',
  'Bunguiao',
  'Boalan',
  'Arena Blanco',
  'Campo Islam',
  'Camino Nuevo',
  'Zone I (Poblacion)',
  'Zone II (Poblacion)',
  'Zone III (Poblacion)',
  'Zone IV (Poblacion)',
  'Sta. Barbara',
  'Kasanyangan',
  'Rio Hondo',
  'Mariki',
  'Lumbangan',
  'Victoria',
  'Quiniput',
  'Buenavista',
  'Licomo',
  'Tictapul',
  'Tagasilay',
  'Dulian (Upper)',
  'Dulian (Lower)',
  'Capisan',
  'Pamucutan',
  'Sinunuc',
  'Maasin',
  'Cawit',
  'Malagutay',
  'Sibulao',
  'Tigtabon',
];

export default function BarangayAutocomplete({ value, onChangeText, placeholder = 'Search or type Barangay...' }) {
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

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
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
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 198,
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
    backgroundColor: colors.primaryLight + '20',
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
