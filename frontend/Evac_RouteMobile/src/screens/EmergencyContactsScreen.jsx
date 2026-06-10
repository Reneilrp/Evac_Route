import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, Shield, Flame, Anchor, Heart, Building } from 'lucide-react-native';
import { colors } from '../styles/theme';
import styles from '../styles/EmergencyContactsScreen.styles';

const EMERGENCY_CONTACTS = [
  {
    section: 'EMERGENCY HOTLINES',
    contacts: [
      { name: 'National Emergency', number: '911', icon: Phone, iconBg: 'rgba(239, 68, 68, 0.15)', iconColor: colors.danger },
      { name: 'CDRRMO Zamboanga', number: '(062) 991-0959', icon: Shield, iconBg: 'rgba(59, 130, 246, 0.15)', iconColor: colors.primary },
      { name: 'Bureau of Fire Protection', number: '(062) 991-1064', icon: Flame, iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: colors.warning },
      { name: 'Philippine Coast Guard', number: '(062) 992-2694', icon: Anchor, iconBg: 'rgba(34, 197, 94, 0.15)', iconColor: colors.successLight },
    ],
  },
  {
    section: 'HOSPITALS & MEDICAL',
    contacts: [
      { name: 'Zamboanga City Medical Center', number: '(062) 991-0573', icon: Heart, iconBg: 'rgba(239, 68, 68, 0.15)', iconColor: colors.dangerLight },
      { name: 'West Metro Medical Center', number: '(062) 993-1485', icon: Heart, iconBg: 'rgba(239, 68, 68, 0.15)', iconColor: colors.dangerLight },
    ],
  },
  {
    section: 'LOCAL GOVERNMENT',
    contacts: [
      { name: "City Mayor's Office", number: '(062) 991-0584', icon: Building, iconBg: 'rgba(59, 130, 246, 0.15)', iconColor: colors.primary },
    ],
  },
];

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();

  const handleCall = (number, name) => {
    // Clean number for dialing (remove parentheses, spaces, dashes)
    const cleanNumber = number.replace(/[^0-9+]/g, '');
    const phoneUrl = `tel:${cleanNumber}`;

    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Cannot Call', `Direct calling is not supported. Please dial ${number} manually.`);
      }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <Text style={styles.headerSubtitle}>
            Tap any contact to call directly. Keep this list accessible during emergencies.
          </Text>
        </View>

        {EMERGENCY_CONTACTS.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.contacts.map((contact, cIdx) => {
              const IconComponent = contact.icon;
              return (
                <View key={cIdx} style={styles.contactCard}>
                  <View style={[styles.contactIconCircle, { backgroundColor: contact.iconBg }]}>
                    <IconComponent size={24} color={contact.iconColor} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(contact.number, contact.name)}
                    activeOpacity={0.7}
                  >
                    <Phone size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Emergency Tips</Text>
          <Text style={styles.infoText}>
            • Stay calm and follow official evacuation instructions{'\n'}
            • Keep your phone charged — use power-saving mode{'\n'}
            • Share your location with family members{'\n'}
            • If trapped, signal by banging on hard surfaces
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
