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
  UserPlus,
  X,
  Plus,
  Minus,
  CheckCircle,
  ShieldAlert,
  Ticket,
} from 'lucide-react-native';

const VULNERABILITY_OPTIONS = [
  { id: 'infants', label: 'Infant / Toddler (<2yo)', icon: '👶' },
  { id: 'pregnant', label: 'Pregnant Mother', icon: '🤰' },
  { id: 'seniors', label: 'Senior Citizen (60+)', icon: '🧓' },
  { id: 'pwd', label: 'PWD / Mobility Impaired', icon: '♿' },
  { id: 'maintenance_meds', label: 'Maintenance Meds Needed', icon: '💊' },
];

export default function RapidWalkInModal({
  visible = true,
  inline = false,
  onClose,
  onSubmit,
  shelterName,
  loading,
}) {
  const [familyName, setFamilyName] = useState('');
  const [headcount, setHeadcount] = useState(1);
  const [barangay, setBarangay] = useState('Tetuan');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedVulnerabilities, setSelectedVulnerabilities] = useState([]);
  const [issuedVoucher, setIssuedVoucher] = useState(null);

  const toggleVulnerability = (id) => {
    setSelectedVulnerabilities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleReset = () => {
    setFamilyName('');
    setHeadcount(1);
    setBarangay('Tetuan');
    setContactNumber('');
    setSelectedVulnerabilities([]);
    setIssuedVoucher(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!familyName.trim()) {
      Alert.alert('Required Field', 'Please enter Family / Household Representative Name.');
      return;
    }

    try {
      const result = await onSubmit({
        name: familyName.trim(),
        family_name: familyName.trim(),
        headcount,
        barangay: barangay.trim() || 'Tetuan',
        contact_number: contactNumber.trim() || 'N/A',
        vulnerabilities: selectedVulnerabilities,
      });

      if (result?.voucher) {
        setIssuedVoucher(result.voucher);
      } else {
        handleClose();
      }
    } catch (_err) {
      // handled by caller
    }
  };

  const cardBody = (
    <View style={inline ? modalStyles.inlineCard : modalStyles.card}>
      {/* Header */}
          <View style={modalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={modalStyles.iconBadge}>
                <UserPlus size={18} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.title}>Rapid Walk-In Intake</Text>
                <Text style={modalStyles.subtitle} numberOfLines={1}>
                  Target: {shelterName || 'Assigned Evacuation Center'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {issuedVoucher ? (
            /* Voucher Issued Success View */
            <View style={modalStyles.voucherSuccessBox}>
              <CheckCircle size={48} color="#10b981" />
              <Text style={modalStyles.voucherSuccessTitle}>VOUCHER ISSUED</Text>
              <Text style={modalStyles.voucherNotice}>
                IDP registered without smartphone. Assign this physical voucher code:
              </Text>

              <View style={modalStyles.voucherCodeBadge}>
                <Ticket size={24} color="#7c3aed" />
                <Text style={modalStyles.voucherCodeText}>{issuedVoucher}</Text>
              </View>

              <Text style={modalStyles.voucherInstruction}>
                Write &quot;{issuedVoucher}&quot; on the paper IDP pass or wristband for meal &amp; dry ration claims.
              </Text>

              <TouchableOpacity
                style={modalStyles.nextEvacueeBtn}
                onPress={handleReset}
              >
                <Text style={modalStyles.nextEvacueeBtnText}>Intake Next IDP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Form View */
            <ScrollView
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={modalStyles.formNotice}>
                Use for victims with dead phone batteries, no smartphones, or unregistered citizens.
              </Text>

              {/* Family / Rep Name */}
              <Text style={modalStyles.label}>Family / Representative Name *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Dela Cruz Family / Juan Dela Cruz"
                placeholderTextColor="#94a3b8"
                value={familyName}
                onChangeText={setFamilyName}
              />

              {/* Headcount Stepper */}
              <Text style={modalStyles.label}>Physical Headcount Present *</Text>
              <View style={modalStyles.stepperRow}>
                <TouchableOpacity
                  onPress={() => setHeadcount((prev) => Math.max(1, prev - 1))}
                  style={modalStyles.stepperBtn}
                >
                  <Minus size={20} color="#1e293b" />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', minWidth: 60 }}>
                  <Text style={modalStyles.stepperValue}>{headcount}</Text>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>PAX</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setHeadcount((prev) => prev + 1)}
                  style={[modalStyles.stepperBtn, { backgroundColor: '#2563eb' }]}
                >
                  <Plus size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Barangay & Contact */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Barangay</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Barangay"
                    placeholderTextColor="#94a3b8"
                    value={barangay}
                    onChangeText={setBarangay}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Mobile / Contact</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="0917..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={setContactNumber}
                  />
                </View>
              </View>

              {/* Vulnerabilities Triage Chips */}
              <Text style={[modalStyles.label, { marginTop: 14 }]}>
                Vulnerability Triage (Tap all that apply)
              </Text>
              <View style={modalStyles.chipsContainer}>
                {VULNERABILITY_OPTIONS.map((opt) => {
                  const isSelected = selectedVulnerabilities.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => toggleVulnerability(opt.id)}
                      style={[
                        modalStyles.chip,
                        isSelected && modalStyles.chipSelected,
                      ]}
                    >
                      <Text style={{ fontSize: 13 }}>{opt.icon}</Text>
                      <Text
                        style={[
                          modalStyles.chipText,
                          isSelected && modalStyles.chipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={modalStyles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ticket size={18} color="#ffffff" />
                    <Text style={modalStyles.submitBtnText}>
                      Issue Voucher &amp; Admit ({headcount} Pax)
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
    backgroundColor: '#eff6ff',
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#dc2626',
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  voucherSuccessBox: {
    padding: 24,
    alignItems: 'center',
  },
  voucherSuccessTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 10,
    letterSpacing: 1,
  },
  voucherNotice: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  voucherCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  voucherCodeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#6d28d9',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  voucherInstruction: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  nextEvacueeBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  nextEvacueeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
