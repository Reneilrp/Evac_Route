import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Home,
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
}) {
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
                  </View>

                  {/* Operational Info Card */}
                  <View style={styles.infoBlock}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Assigned Shelter:</Text>
                      <Text style={styles.infoValue}>{scanResult.shelter || 'None (Must Check In)'}</Text>
                    </View>
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
                    {checkInSuccess && (
                      <View style={styles.successBadge}>
                        <CheckCircle size={36} color={colors.success} />
                        <Text style={styles.successBadgeTitle}>INTAKE RECORDED</Text>
                        <Text style={styles.successBadgeText}>{checkInSuccess.message}</Text>
                      </View>
                    )}

                    {!scanResult.checkedIn && (
                      <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={executeCheckIn}
                        disabled={checkInLoading}
                      >
                        {checkInLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <CheckCircle size={18} color={colors.white} />
                            <Text style={styles.claimBtnText}>
                              {user?.assigned_shelter?.name || user?.assignedShelter?.name
                                ? `CHECK IN TO ${(user?.assigned_shelter?.name || user?.assignedShelter?.name).toUpperCase()}`
                                : 'CHECK IN RESIDENT'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
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
