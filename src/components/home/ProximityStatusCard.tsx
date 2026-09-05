import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProximityPayload } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface ProximityStatusCardProps {
  proximity: ProximityPayload;
}

export const ProximityStatusCard: React.FC<ProximityStatusCardProps> = ({
  proximity,
}) => {
  const { state, driverName, distanceMeters } = proximity;

  let headline = 'Cloud is chilling';
  let narrative = 'No friends nearby';
  let badgeText = 'Standby';
  let iconName: keyof typeof Ionicons.glyphMap = 'sparkles-outline';
  let accentColor = '#64748B';
  let bgTint = '#F8FAFC';

  switch (state) {
    case 'SENSED':
      headline = `${driverName || 'Friend'} is nearby`;
      narrative = distanceMeters
        ? `Sensed approximately ${distanceMeters}m away`
        : 'Sensed nearby on your route';
      badgeText = 'Sensed';
      iconName = 'radio-outline';
      accentColor = '#3B82F6';
      bgTint = '#EFF6FF';
      break;

    case 'APPROACHING':
      headline = `${driverName || 'Friend'} is approaching`;
      narrative = distanceMeters
        ? `Closing in · ~${distanceMeters}m away`
        : 'Closing in on your direction';
      badgeText = 'Approaching';
      iconName = 'navigate-circle-outline';
      accentColor = '#8B5CF6';
      bgTint = '#F5F3FF';
      break;

    case 'VERY_CLOSE':
      headline = `${driverName || 'Friend'} is very close`;
      narrative = 'Just around you now';
      badgeText = 'Very Close';
      iconName = 'eye-outline';
      accentColor = '#EC4899';
      bgTint = '#FDF2F8';
      break;

    case 'TOGETHER':
    case 'SYNC':
    case 'CONNECTED':
      headline = "You're together";
      narrative = `Driving in proximity with ${driverName || 'friend'}`;
      badgeText = 'Together';
      iconName = 'heart-circle-outline';
      accentColor = '#10B981';
      bgTint = '#ECFDF5';
      break;

    case 'RECOGNIZED':
      headline = `${driverName || 'Friend'} recognized`;
      narrative = 'Companion acknowledged';
      badgeText = 'Recognized';
      iconName = 'checkmark-circle-outline';
      accentColor = '#06B6D4';
      bgTint = '#ECFEFF';
      break;

    case 'GOODBYE':
      headline = 'Farewell for now';
      narrative = `Encounter with ${driverName || 'friend'} saved to memories`;
      badgeText = 'Saved';
      iconName = 'time-outline';
      accentColor = '#F59E0B';
      bgTint = '#FFFBEB';
      break;

    case 'HOME':
    default:
      headline = 'Cloud is chilling';
      narrative = 'No friends nearby';
      badgeText = 'Calm';
      iconName = 'sunny-outline';
      accentColor = '#64748B';
      bgTint = '#F8FAFC';
      break;
  }

  return (
    <View style={[styles.card, { backgroundColor: bgTint, borderColor: accentColor + '30' }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconPill, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={iconName} size={18} color={accentColor} />
        </View>
        <View style={[styles.badge, { backgroundColor: accentColor + '20' }]}>
          <Text style={[styles.badgeLabel, { color: accentColor }]}>
            {badgeText}
          </Text>
        </View>
      </View>

      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.narrative}>{narrative}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeLabel: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headline: {
    ...Typography.title2,
    color: '#0F172A',
    marginBottom: 4,
  },
  narrative: {
    ...Typography.body,
    color: '#64748B',
  },
});
