import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EncounterRecord } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface EncounterCardProps {
  encounter: EncounterRecord;
}

export const EncounterCard: React.FC<EncounterCardProps> = ({ encounter }) => {
  let iconName: keyof typeof Ionicons.glyphMap = 'sparkles-outline';
  let iconColor = '#10B981';
  let iconBg = '#ECFDF5';

  if (encounter.type === 'passed-nearby') {
    iconName = 'car-sport-outline';
    iconColor = '#3B82F6';
    iconBg = '#EFF6FF';
  } else if (encounter.type === 'recognized') {
    iconName = 'checkmark-done-circle-outline';
    iconColor = '#8B5CF6';
    iconBg = '#F5F3FF';
  } else {
    iconName = 'heart-circle-outline';
    iconColor = '#10B981';
    iconBg = '#ECFDF5';
  }

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.driverName}>{encounter.driverName}</Text>
          <Text style={styles.timestamp}>{encounter.formattedTime}</Text>
        </View>
        <Text style={styles.narrative}>{encounter.narrative}</Text>
        {encounter.driverCar && (
          <Text style={styles.carDetail}>In {encounter.driverCar}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  driverName: {
    ...Typography.headline,
    color: '#0F172A',
  },
  timestamp: {
    ...Typography.caption,
    color: '#9CA3AF',
  },
  narrative: {
    ...Typography.body,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  carDetail: {
    ...Typography.caption,
    color: '#9CA3AF',
  },
});
