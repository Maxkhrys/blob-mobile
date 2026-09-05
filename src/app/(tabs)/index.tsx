import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/AppContext';
import { DeviceHeader } from '../../components/home/DeviceHeader';
import { ProximityStatusCard } from '../../components/home/ProximityStatusCard';
import { CloudPreview } from '../../components/character/CloudPreview';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, device, proximity, cloudEmotion, drivers } = useAppStore();

  const activeDriver = proximity.driverId
    ? drivers.find((d) => d.id === proximity.driverId)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Device & Driver Header */}
        <DeviceHeader
          device={device}
          profile={profile}
          onPressDevice={() => router.push('/(tabs)/settings')}
        />

        {/* Character Emotional Hero Preview */}
        <View style={styles.heroSection}>
          <CloudPreview
            colourId={profile.characterColour}
            emotion={cloudEmotion}
            proximityState={proximity.state}
            driverYaw={
              proximity.state !== 'HOME' && proximity.direction === 'left'
                ? -0.5
                : proximity.state !== 'HOME' && proximity.direction === 'right'
                ? 0.5
                : 0
            }
            driverPitch={
              proximity.state !== 'HOME' && proximity.direction === 'ahead'
                ? -0.2
                : proximity.state !== 'HOME' && proximity.direction === 'behind'
                ? 0.25
                : 0
            }
            size={240}
          />
        </View>

        {/* Proximity Narrative Card */}
        <ProximityStatusCard proximity={proximity} />

        {/* Active Driver Companion Card (if sensed/approaching/together) */}
        {activeDriver && proximity.state !== 'HOME' && proximity.state !== 'GOODBYE' && (
          <View style={styles.activeDriverCard}>
            <View
              style={[
                styles.driverAvatar,
                { backgroundColor: activeDriver.avatarColor },
              ]}
            >
              <Text style={styles.driverInitials}>
                {activeDriver.avatarInitials}
              </Text>
            </View>
            <View style={styles.driverMeta}>
              <Text style={styles.driverName}>{activeDriver.name}</Text>
              <Text style={styles.driverCar}>{activeDriver.carName}</Text>
            </View>
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>{proximity.state}</Text>
            </View>
          </View>
        )}

        {/* Quick Simulator Access Pill */}
        <TouchableOpacity
          style={styles.simulatorPill}
          onPress={() => router.push('/simulator')}
          activeOpacity={0.8}
        >
          <Ionicons name="pulse" size={16} color="#4F46E5" />
          <Text style={styles.simulatorPillText}>
            Open Proximity Simulator
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#6366F1" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  activeDriverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  driverMeta: {
    flex: 1,
  },
  driverName: {
    ...Typography.headline,
    color: '#0F172A',
    fontSize: 15,
  },
  driverCar: {
    ...Typography.caption,
    color: '#64748B',
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#EEF2FF',
  },
  activeTagText: {
    ...Typography.caption,
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 11,
  },
  simulatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.full,
    gap: 8,
  },
  simulatorPillText: {
    ...Typography.callout,
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 13,
  },
});
