import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/AppContext';
import { ProximityState } from '../types';
import { Radius, Spacing, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SimulatorScreen() {
  const router = useRouter();
  const { proximity, setProximityState, resetProximity, drivers } =
    useAppStore();

  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    proximity.driverId || drivers[0]?.id || 'alex'
  );
  const [direction, setDirection] = useState<'ahead' | 'left' | 'right' | 'behind'>(
    proximity.direction || 'ahead'
  );
  const [distance, setDistance] = useState<number>(
    proximity.distanceMeters ?? 75
  );

  const selectedDriver =
    drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  const stateButtons: {
    id: ProximityState;
    label: string;
    desc: string;
    color: string;
    defaultDist: number;
  }[] = [
    {
      id: 'HOME',
      label: 'HOME / NONE',
      desc: 'Neutral standby, no friends nearby',
      color: '#64748B',
      defaultDist: 0,
    },
    {
      id: 'SENSED',
      label: 'SENSED',
      desc: 'Signal detected on route',
      color: '#3B82F6',
      defaultDist: 150,
    },
    {
      id: 'APPROACHING',
      label: 'APPROACHING',
      desc: 'Vehicle closing in (~75m)',
      color: '#8B5CF6',
      defaultDist: 75,
    },
    {
      id: 'VERY_CLOSE',
      label: 'VERY CLOSE',
      desc: 'Vehicle immediately nearby (~20m)',
      color: '#EC4899',
      defaultDist: 20,
    },
    {
      id: 'TOGETHER',
      label: 'TOGETHER',
      desc: 'Cruising side-by-side or convoy',
      color: '#10B981',
      defaultDist: 5,
    },
    {
      id: 'SYNC',
      label: 'SYNC',
      desc: 'Active state synchronization',
      color: '#059669',
      defaultDist: 5,
    },
    {
      id: 'CONNECTED',
      label: 'CONNECTED',
      desc: 'Full high-bandwidth connection',
      color: '#0D9488',
      defaultDist: 5,
    },
    {
      id: 'RECOGNIZED',
      label: 'RECOGNIZED',
      desc: 'Driver identity acknowledged',
      color: '#0284C7',
      defaultDist: 30,
    },
    {
      id: 'GOODBYE',
      label: 'GOODBYE',
      desc: 'Vehicles departing · saves memory',
      color: '#F59E0B',
      defaultDist: 180,
    },
  ];

  const handleTriggerState = (item: (typeof stateButtons)[0]) => {
    const dist = item.id === 'HOME' ? 0 : distance || item.defaultDist;
    setProximityState(
      item.id,
      selectedDriver.id,
      selectedDriver.name,
      direction,
      dist,
      8
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Header */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color="#4338CA" />
          <Text style={styles.noticeText}>
            Simulator feeds the same `IProximityService` interface that future
            BLE & GPS location hardware will drive.
          </Text>
        </View>

        {/* 1. Target Driver Selection */}
        <Text style={styles.sectionTitle}>1. Target Driver</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.driverList}
        >
          {drivers.map((driver) => {
            const isSelected = driver.id === selectedDriverId;
            return (
              <TouchableOpacity
                key={driver.id}
                style={[
                  styles.driverPill,
                  isSelected && styles.driverPillSelected,
                ]}
                onPress={() => setSelectedDriverId(driver.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.driverAvatarSmall,
                    { backgroundColor: driver.avatarColor },
                  ]}
                >
                  <Text style={styles.avatarInitials}>
                    {driver.avatarInitials}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.driverPillText,
                    isSelected && styles.driverPillTextSelected,
                  ]}
                >
                  {driver.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Direction & Distance */}
        <Text style={styles.sectionTitle}>2. Spatial Vector & Distance</Text>
        <View style={styles.directionRow}>
          {(['ahead', 'left', 'right', 'behind'] as const).map((dir) => (
            <TouchableOpacity
              key={dir}
              style={[
                styles.dirButton,
                direction === dir && styles.dirButtonActive,
              ]}
              onPress={() => setDirection(dir)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dirText,
                  direction === dir && styles.dirTextActive,
                ]}
              >
                {dir.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.directionRow}>
          {[5, 20, 75, 150].map((dist) => (
            <TouchableOpacity
              key={dist}
              style={[
                styles.dirButton,
                distance === dist && styles.dirButtonActive,
              ]}
              onPress={() => setDistance(dist)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dirText,
                  distance === dist && styles.dirTextActive,
                ]}
              >
                {dist}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. State Buttons */}
        <Text style={styles.sectionTitle}>3. Product State Triggers</Text>
        <View style={styles.stateGrid}>
          {stateButtons.map((btn) => {
            const isActive = proximity.state === btn.id;
            return (
              <TouchableOpacity
                key={btn.id}
                style={[
                  styles.stateCard,
                  { borderLeftColor: btn.color },
                  isActive && { backgroundColor: btn.color + '15' },
                ]}
                onPress={() => handleTriggerState(btn)}
                activeOpacity={0.7}
              >
                <View style={styles.stateHeader}>
                  <Text style={[styles.stateLabel, { color: btn.color }]}>
                    {btn.label}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.activeBadge,
                        { backgroundColor: btn.color },
                      ]}
                    >
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.stateDesc}>{btn.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Active Payload Readout */}
        <Text style={styles.sectionTitle}>4. Live Broadcast Payload</Text>
        <View style={styles.payloadBox}>
          <Text style={styles.payloadCode}>
            {JSON.stringify(
              {
                state: proximity.state,
                driverId: proximity.driverId,
                driverName: proximity.driverName,
                direction: proximity.direction,
                distanceMeters: proximity.distanceMeters,
                closingSpeedMps: proximity.closingSpeedMps,
              },
              null,
              2
            )}
          </Text>
        </View>

        {/* Action Buttons: Reset and Return */}
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.returnButtonText}>Return to Home & View</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.returnButton, { backgroundColor: '#E2E8F0' }]}
            onPress={resetProximity}
            activeOpacity={0.8}
          >
            <Text style={[styles.returnButtonText, { color: '#0F172A' }]}>
              Reset to Standby (HOME)
            </Text>
            <Ionicons name="refresh" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
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
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  noticeText: {
    ...Typography.subhead,
    color: '#3730A3',
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    ...Typography.callout,
    color: '#6B7280',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  driverList: {
    gap: 8,
    marginBottom: Spacing.sm,
  },
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  driverPillSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F1F5F9',
  },
  driverAvatarSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  driverPillText: {
    ...Typography.callout,
    color: '#374151',
  },
  driverPillTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  directionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  dirButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dirButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  dirText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#4B5563',
  },
  dirTextActive: {
    color: '#FFFFFF',
  },
  stateGrid: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stateLabel: {
    ...Typography.headline,
    fontSize: 15,
  },
  stateDesc: {
    ...Typography.caption,
    color: '#6B7280',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  payloadBox: {
    backgroundColor: '#0F172A',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  payloadCode: {
    fontFamily: 'monospace',
    color: '#38BDF8',
    fontSize: 12,
    lineHeight: 18,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  returnButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
