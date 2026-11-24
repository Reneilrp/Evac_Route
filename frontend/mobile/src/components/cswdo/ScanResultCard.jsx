import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Home,
  Plus,
  Minus,
  Clock,
  LogIn,
  LogOut,
  ShieldAlert,
} from 'lucide-react-native';

export default function ScanResultCard({
  styles,
  colors,
  loading,
  error,
  resetScanner,
  scanResult,
  claimSuccess,
  checkInSuccess,
  user,
  checkInLoading,
  executeCheckIn,
  claimLoading,
  executeClaim,
  onIssueDayPass,
  onReturnDayPass,
  dayPassLoading,
}) {
  const [actualHeadcount, setActualHeadcount] = useState(1);
  const [selectedNfis, setSelectedNfis] = useState(['blanket', 'hygiene_kit']);

  const toggleNfi = (id) => {
    setSelectedNfis((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (scanResult?.headcount) {
      setActualHeadcount(scanResult.headcount);
    }
  }, [scanResult]);

  return (
    <View style={styles.resultContainer}>
      {loading && (
        <View style={styles.resultLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.resultLoadingText}>Fetching Resident Status...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.statusBox}>
          <XCircle size={52} color={colors.danger} style={styles.statusIcon} />
          <Text style={styles.statusTitle}>Verification Failed</Text>
          <Text style={styles.statusMsg}>{error}</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetScanner}>
            <RefreshCw size={16} color={colors.white} />
            <Text style={styles.resetBtnText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanResult && !loading && (
        <View style={styles.residentDetails}>
          {claimSuccess ? (
            <View style={styles.successBadge}>
              <CheckCircle size={40} color={colors.success} />
              <Text style={styles.successBadgeTitle}>RATION DISPENSED</Text>
              <Text style={styles.successBadgeText}>
                Successfully claimed for {claimSuccess.familyName} ({claimSuccess.headcount} Pax)
              </Text>
            </View>
          ) : (
            <View style={styles.detailsHeader}>
              <Text style={styles.familyName}>{scanResult.familyName}</Text>
              <View style={styles.paxRow}>
                <Users size={18} color={colors.textSecondary} />
                <Text style={styles.paxCount}>{scanResult.headcount} Registered Pax</Text>
              </View>
            </View>
          )}

          {/* Status Badges */}
          <View style={styles.badgeSection}>
            {scanResult.checkedIn ? (
              <View style={[styles.statusBadge, styles.badgeSuccess]}>
                <CheckCircle size={14} color={colors.successText} />
                <Text style={[styles.badgeText, styles.textSuccess]}>Checked In</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.badgeDanger]}>
                <XCircle size={14} color={colors.dangerText} />
                <Text style={[styles.badgeText, styles.textDanger]}>Not Checked In</Text>
              </View>
            )}

            {scanResult.rationClaimed ? (
              <View style={[styles.statusBadge, styles.badgeWarning]}>
                <AlertTriangle size={14} color={colors.warningText} />
                <Text style={[styles.badgeText, styles.textWarning]}>Ration Claimed</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.badgeSuccess]}>
                <CheckCircle size={14} color={colors.successText} />
                <Text style={[styles.badgeText, styles.textSuccess]}>Ration Available</Text>
              </View>
            )}

            {scanResult.walkInVoucher && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(147, 51, 234, 0.15)' }]}>
                <Text style={[styles.badgeText, { color: '#9333ea', fontWeight: 'bold' }]}>
                  {scanResult.walkInVoucher}
                </Text>
              </View>
            )}
          </View>

          {/* Vulnerability indicators if any */}
          {Array.isArray(scanResult.vulnerabilities) && scanResult.vulnerabilities.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
              {scanResult.vulnerabilities.map((v, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    borderWidth: 1,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ShieldAlert size={11} color="#ef4444" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444', textTransform: 'capitalize' }}>
                    {v.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Operational Info Card */}
          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned Shelter:</Text>
              <Text style={styles.infoValue}>{scanResult.shelter || 'None (Must Check In)'}</Text>
            </View>
            {scanResult.actualHeadcount && scanResult.checkedIn && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Physical Headcount:</Text>
                <Text style={styles.infoValue}>{scanResult.actualHeadcount} Pax Present</Text>
              </View>
            )}
            {scanResult.rationClaimed && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Claim Timestamp:</Text>
                <Text style={styles.infoValue}>
                  {new Date(scanResult.claimedAt).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionBlock}>
            {/* CDRRMO Anti-Duplication Warning Banner */}
            {(scanResult.hasClaimed || scanResult.isDuplicateClaim || scanResult.duplicateWarning) && (
              <View
                style={{
                  backgroundColor: '#fef3c7',
                  borderColor: '#f59e0b',
                  borderWidth: 1.5,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <AlertTriangle size={24} color="#d97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400e' }}>
                    ANTI-DUPLICATION ALERT
                  </Text>
                  <Text style={{ fontSize: 11, color: '#b45309', marginTop: 2, lineHeight: 16 }}>
                    {scanResult.duplicateWarning || '⚠️ This IDP household has already claimed relief rations today. Verify household identity before re-allocating.'}
                  </Text>
                </View>
              </View>
            )}

            {checkInSuccess && (
              <View style={styles.successBadge}>
                <CheckCircle size={36} color={colors.success} />
                <Text style={styles.successBadgeTitle}>INTAKE RECORDED</Text>
                <Text style={styles.successBadgeText}>{checkInSuccess.message}</Text>
              </View>
            )}

            {/* PARTIAL HEADCOUNT STEPPER (When not yet checked in) */}
            {!scanResult.checkedIn && (
              <View
                style={{
                  marginVertical: 10,
                  padding: 12,
                  backgroundColor: colors.surfaceElevated || '#f8fafc',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.cardBorder || '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
                  Verify Actual Headcount Present at Gate
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: 10 }}>
                  Family registered: {scanResult.headcount} Pax
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <TouchableOpacity
                    onPress={() => setActualHeadcount((prev) => Math.max(1, prev - 1))}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.cardBorder || '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel="Decrease headcount"
                  >
                    <Minus size={22} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center', minWidth: 60 }}>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>
                      {actualHeadcount}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                      PRESENT
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setActualHeadcount((prev) => prev + 1)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel="Increase headcount"
                  >
                    <Plus size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {actualHeadcount < scanResult.headcount && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.warningText || '#b45309',
                      marginTop: 10,
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    ⚠️ Partial Intake: {scanResult.headcount - actualHeadcount} family member(s) will check in later.
                  </Text>
                )}

                {/* CSWDO Non-Food Items (NFIs) & Kits Checklist */}
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>
                    CSWDO Relief &amp; NFI Kit Checklist:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { id: 'blanket', label: 'Warm Blanket', icon: '🛏️' },
                      { id: 'hygiene_kit', label: 'Hygiene Kit', icon: '🧼' },
                      { id: 'dignity_kit', label: 'Dignity Kit', icon: '🌸' },
                      { id: 'medicine', label: 'First Aid / Meds', icon: '💊' },
                    ].map((item) => {
                      const isSelected = selectedNfis.includes(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => toggleNfi(item.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.15)' : colors.cardBorder || '#f1f5f9',
                            borderColor: isSelected ? '#0284c7' : 'transparent',
                            borderWidth: 1,
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>{item.icon}</Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? '#0284c7' : colors.textSecondary,
                            }}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {!scanResult.checkedIn && (
              <TouchableOpacity
                style={styles.checkInBtn}
                onPress={() => executeCheckIn(actualHeadcount, selectedNfis)}
                disabled={checkInLoading}
              >
                {checkInLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <CheckCircle size={18} color={colors.white} />
                    <Text style={styles.claimBtnText}>
                      {user?.assigned_shelter?.name || user?.assignedShelter?.name
                        ? `CHECK IN (${actualHeadcount} PAX) TO ${(user?.assigned_shelter?.name || user?.assignedShelter?.name).toUpperCase()}`
                        : `CHECK IN ${actualHeadcount} RESIDENTS`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* TEMPORARY DAY PASS MANAGEMENT (When checked in) */}
            {scanResult.checkedIn && (
              <View style={{ marginVertical: 8 }}>
                {scanResult.isTemporaryOffsite ? (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} color="#d97706" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#b45309' }}>
                        Temporary Day Pass Active
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                      IDP authorized for daytime mud-cleaning / livestock inspection.
                    </Text>
                    <TouchableOpacity
                      onPress={() => onReturnDayPass && onReturnDayPass(scanResult.logId || scanResult.hash)}
                      disabled={dayPassLoading}
                      style={{
                        marginTop: 10,
                        paddingVertical: 12,
                        backgroundColor: '#10b981',
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {dayPassLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <LogIn size={16} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                            🏠 Confirm Return to Shelter
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => onIssueDayPass && onIssueDayPass(scanResult.logId || scanResult.hash)}
                    disabled={dayPassLoading}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: colors.surfaceElevated || '#f1f5f9',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.cardBorder || '#cbd5e1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {dayPassLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <LogOut size={15} color={colors.textSecondary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                          🚪 Issue Temporary Day Pass (Mud Cleaning / Livestock)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {scanResult.checkedIn && !scanResult.rationClaimed && !claimSuccess ? (
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={executeClaim}
                disabled={claimLoading}
              >
                {claimLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Home size={18} color={colors.white} />
                    <Text style={styles.claimBtnText}>DISPENSE RATION PACKAGE</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {(!scanResult.checkedIn || (scanResult.rationClaimed && !claimSuccess)) && (
              <View style={styles.statusWarningBox}>
                <AlertTriangle size={18} color={colors.warning} />
                <Text style={styles.warningBoxText}>
                  {!scanResult.checkedIn
                    ? 'Resident must check in to a shelter first to be eligible for relief rations.'
                    : 'This resident has already received their designated supply packages.'}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.secondaryScanBtn} onPress={resetScanner}>
              <RefreshCw size={16} color={colors.textSecondary} />
              <Text style={styles.secondaryScanBtnText}>Scan Next Resident</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
