import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  HeartHandshake,
  X,
  Plus,
  Minus,
  CheckCircle,
  Soup,
  PackageCheck,
} from 'lucide-react-native';

const CATEGORY_PRESETS = [
  { id: 'hot_meals', label: 'Hot Meals / Lugaw', unit: 'servings', icon: '🍲' },
  { id: 'bottled_water', label: 'Bottled Water', unit: 'bottles', icon: '💧' },
  { id: 'bread_pastry', label: 'Bread / Pan de Sal', unit: 'packs', icon: '🍞' },
  { id: 'canned_goods', label: 'Canned Goods', unit: 'cans', icon: '🥫' },
  { id: 'hygiene_kits', label: 'Hygiene Kits', unit: 'kits', icon: '🧼' },
  { id: 'clothing', label: 'Clothing / Blankets', unit: 'pieces', icon: '👕' },
];

export default function LogDonationModal({
  visible = true,
  inline = false,
  onClose,
  onSubmit,
  shelterName,
  loading,
}) {
  const [donorName, setDonorName] = useState('');
  const [donorType, setDonorType] = useState('citizen'); // citizen, ngo, lgu, private_business
  const [category, setCategory] = useState('hot_meals');
  const [itemName, setItemName] = useState('Hot Lugaw with Egg');
  const [quantity, setQuantity] = useState(50);
  const [unit, setUnit] = useState('servings');
  const [estimatedServings, setEstimatedServings] = useState(50);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  const selectCategory = (cat) => {
    setCategory(cat.id);
    setUnit(cat.unit);
    if (cat.id === 'hot_meals') {
      setItemName('Hot Lugaw / Packed Meals');
    } else if (cat.id === 'bottled_water') {
      setItemName('Bottled Drinking Water (500ml)');
    } else if (cat.id === 'bread_pastry') {
      setItemName('Pan de Sal / Biscuits');
    } else {
      setItemName(cat.label);
    }
  };

  const handleReset = () => {
    setDonorName('');
    setDonorType('citizen');
    setCategory('hot_meals');
    setItemName('Hot Lugaw with Egg');
    setQuantity(50);
    setUnit('servings');
    setEstimatedServings(50);
    setNotes('');
    setSuccessMsg(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!donorName.trim()) {
      Alert.alert('Required Field', 'Please enter Donor Name / Organization.');
      return;
    }
    if (quantity <= 0) {
      Alert.alert('Required Field', 'Quantity must be at least 1.');
      return;
    }

    try {
      await onSubmit({
        donor_name: donorName.trim(),
        donor_type: donorType,
        category,
        item_name: itemName.trim() || category,
        quantity,
        unit,
        estimated_servings: estimatedServings || quantity,
        distribution_phase: 'phase_1_influx',
        notes: notes.trim() || undefined,
      });

      setSuccessMsg(`Logged ${quantity} ${unit} of "${itemName}" from ${donorName}. Ready for immediate distribution!`);
    } catch (_err) {
      // Handled by caller
    }
  };

  const cardBody = (
    <View style={inline ? modalStyles.inlineCard : modalStyles.card}>
      {/* Header */}
      <View style={modalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={[modalStyles.iconBadge, { backgroundColor: '#fef2f2' }]}>
                <HeartHandshake size={18} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.title}>Log Community Donation</Text>
                <Text style={modalStyles.subtitle} numberOfLines={1}>
                  Shelter: {shelterName || 'Active Evacuation Center'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {successMsg ? (
            <View style={modalStyles.successBox}>
              <CheckCircle size={48} color="#10b981" />
              <Text style={modalStyles.successTitle}>DONATION LOGGED</Text>
              <Text style={modalStyles.successText}>{successMsg}</Text>

              <TouchableOpacity
                style={modalStyles.actionNextBtn}
                onPress={handleReset}
              >
                <Text style={modalStyles.actionNextBtnText}>Log Another Donation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.actionNextBtn, { backgroundColor: '#64748b', marginTop: 8 }]}
                onPress={handleClose}
              >
                <Text style={modalStyles.actionNextBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={modalStyles.formNotice}>
                Log hot food, water, or dry supplies dropped off directly by citizens, local bakeries, or NGOs.
              </Text>

              {/* Category Quick Chips */}
              <Text style={modalStyles.label}>Item Category</Text>
              <View style={modalStyles.chipsContainer}>
                {CATEGORY_PRESETS.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => selectCategory(cat)}
                      style={[
                        modalStyles.chip,
                        isSelected && modalStyles.chipSelected,
                      ]}
                    >
                      <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                      <Text
                        style={[
                          modalStyles.chipText,
                          isSelected && modalStyles.chipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Donor Name & Type */}
              <Text style={modalStyles.label}>Donor / Organization Name *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Barangay Tanod / Zamboanga Rotary / Juan"
                placeholderTextColor="#94a3b8"
                value={donorName}
                onChangeText={setDonorName}
              />

              {/* Item Description */}
              <Text style={[modalStyles.label, { marginTop: 12 }]}>Item Description</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Hot Arroz Caldo / 500ml Bottled Water"
                placeholderTextColor="#94a3b8"
                value={itemName}
                onChangeText={setItemName}
              />

              {/* Quantity & Unit */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Quantity ({unit}) *</Text>
                  <View style={modalStyles.stepperRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const q = Math.max(1, quantity - 10);
                        setQuantity(q);
                        setEstimatedServings(q);
                      }}
                      style={modalStyles.stepperBtn}
                    >
                      <Minus size={18} color="#1e293b" />
                    </TouchableOpacity>
                    <TextInput
                      style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center', minWidth: 40 }}
                      keyboardType="number-pad"
                      value={String(quantity)}
                      onChangeText={(val) => {
                        const num = parseInt(val, 10) || 0;
                        setQuantity(num);
                        setEstimatedServings(num);
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const q = quantity + 10;
                        setQuantity(q);
                        setEstimatedServings(q);
                      }}
                      style={[modalStyles.stepperBtn, { backgroundColor: '#e11d48' }]}
                    >
                      <Plus size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Est. Servings</Text>
                  <View style={modalStyles.stepperRow}>
                    <TextInput
                      style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center', width: '100%' }}
                      keyboardType="number-pad"
                      value={String(estimatedServings)}
                      onChangeText={(val) => setEstimatedServings(parseInt(val, 10) || 0)}
                    />
                  </View>
                </View>
              </View>

              {/* Notes */}
              <Text style={[modalStyles.label, { marginTop: 12 }]}>Distribution Notes</Text>
              <TextInput
                style={[modalStyles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="e.g. Arrived steaming hot, hand out to Quad A evacuees first"
                placeholderTextColor="#94a3b8"
                multiline={true}
                value={notes}
                onChangeText={setNotes}
              />

              {/* Submit */}
              <TouchableOpacity
                style={modalStyles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <PackageCheck size={18} color="#ffffff" />
                    <Text style={modalStyles.submitBtnText}>
                      Record &amp; Clear for Distribution
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
    </View>
  );

  if (inline) {
    return cardBody;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={modalStyles.overlay}>
        {cardBody}
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  inlineCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  formNotice: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipSelected: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    borderColor: '#e11d48',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#be123c',
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successBox: {
    padding: 24,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 10,
    letterSpacing: 1,
  },
  successText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  actionNextBtn: {
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  actionNextBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
