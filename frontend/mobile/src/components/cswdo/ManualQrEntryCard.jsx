import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Send } from 'lucide-react-native';

export default function ManualQrEntryCard({
  styles,
  colors,
  isDarkMode,
  manualHash,
  setManualHash,
  handleManualSubmit,
}) {
  return (
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manual Override Fallback</Text>
            <Text style={styles.manualSubtitle}>If code is damaged or camera unavailable, enter hash:</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter QR Code Hash..."
                placeholderTextColor={colors.textMuted}
                value={manualHash}
                onChangeText={setManualHash}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.manualSendBtn} onPress={handleManualSubmit}>
                <Send size={18} color={colors.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 8,
                alignSelf: 'flex-start',
                backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                borderWidth: 1,
                borderColor: '#0284c7',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
              onPress={() => {
                setManualHash('hash_test_code_pheinz');
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: 'bold' }}>
                ⚡ Paste Test Token (&apos;pheinz&apos;)
              </Text>
            </TouchableOpacity>
          </View>

  );
}
