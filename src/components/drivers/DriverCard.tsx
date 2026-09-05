import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Driver } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface DriverCardProps {
  driver: Driver;
  onPressSimulate?: (driver: Driver) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onPressSimulate,
}) => {
  let statusColor = '#9CA3AF';
  let statusBg = '#F3F4F6';

  switch (driver.status) {
    case 'Together':
      statusColor = '#10B981';
      statusBg = '#ECFDF5';
      break;
    case 'Very close':
      statusColor = '#EC4899';
      statusBg = '#FDF2F8';
      break;
    case 'Approaching':
      statusColor = '#8B5CF6';
      statusBg = '#F5F3FF';
      break;
    case 'Nearby':
      statusColor = '#3B82F6';
      statusBg = '#EFF6FF';
      break;
    case 'Online':
      statusColor = '#10B981';
      statusBg = '#ECFDF5';
      break;
    case 'Offline':
    default:
      statusColor = '#9CA3AF';
      statusBg = '#F3F4F6';
      break;
  }

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: driver.avatarColor }]}>
        <Text style={styles.avatarInitials}>{driver.avatarInitials}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.nameRow}>
          <Text style={styles.driverName}>{driver.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {driver.status}
            </Text>
          </View>
        </View>
        <Text style={styles.carName}>{driver.carName}</Text>
      </View>

      {onPressSimulate && (
        <TouchableOpacity
          style={styles.simulateButton}
          onPress={() => onPressSimulate(driver)}
          activeOpacity={0.7}
        >
          <Ionicons name="pulse-outline" size={18} color="#4F46E5" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarInitials: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  driverName: {
    ...Typography.headline,
    color: '#0F172A',
  },
  carName: {
    ...Typography.subhead,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  simulateButton: {
    padding: 8,
    borderRadius: Radius.full,
    backgroundColor: '#EEF2FF',
    marginLeft: 8,
  },
});
