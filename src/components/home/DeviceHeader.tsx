import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Device, UserProfile } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface DeviceHeaderProps {
  device: Device;
  profile: UserProfile;
  onPressDevice?: () => void;
}

export const DeviceHeader: React.FC<DeviceHeaderProps> = ({
  device,
  profile,
  onPressDevice,
}) => {
  const isConnected = device.state === 'Connected';
  const isReconnecting = device.state === 'Reconnecting';

  const statusColor = isConnected
    ? '#10B981'
    : isReconnecting
    ? '#F59E0B'
    : '#EF4444';

  const statusBg = isConnected
    ? '#ECFDF5'
    : isReconnecting
    ? '#FFFBEB'
    : '#FEF2F2';

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.carSubtitle}>
          {profile.carName ? `${profile.username}'s ${profile.carName}` : profile.username}
        </Text>
        <Text style={styles.characterTitle}>{profile.characterName}</Text>
      </View>

      <TouchableOpacity
        style={[styles.devicePill, { backgroundColor: statusBg, borderColor: statusColor }]}
        onPress={onPressDevice}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.deviceText, { color: statusColor }]}>
          {device.state}
        </Text>
        {isConnected && (
          <View style={styles.batteryContainer}>
            <Ionicons name="battery-half-outline" size={14} color={statusColor} />
            <Text style={[styles.batteryText, { color: statusColor }]}>
              {device.battery}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  leftSection: {
    flex: 1,
  },
  carSubtitle: {
    ...Typography.subhead,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  characterTitle: {
    ...Typography.title1,
    color: '#0F172A',
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  deviceText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
    paddingLeft: 6,
  },
  batteryText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
