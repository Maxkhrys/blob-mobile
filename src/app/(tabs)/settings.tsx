import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/AppContext';
import { SliderControl } from '../../components/common/SliderControl';
import { CloudEmotion, PrivacyMode, SleepMode } from '../../types';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    profile,
    updateProfile,
    device,
    setDeviceBrightness,
    setDeviceSleepMode,
    setDeviceConnection,
    reconnectDevice,
    resetOnboarding,
    triggerEmotion,
  } = useAppStore();

  const isConnected = device.state === 'Connected';

  const handleToggleConnection = () => {
    setDeviceConnection(isConnected ? 'Disconnected' : 'Connected');
  };

  const emotions: { id: CloudEmotion; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'happy', label: 'Happy', icon: 'happy-outline' },
    { id: 'curious', label: 'Curious', icon: 'help-circle-outline' },
    { id: 'sleepy', label: 'Sleepy', icon: 'moon-outline' },
    { id: 'excited', label: 'Excited', icon: 'sparkles-outline' },
    { id: 'surprised', label: 'Surprised', icon: 'alert-circle-outline' },
  ];

  const sleepModes: { id: SleepMode; label: string }[] = [
    { id: 'always-awake', label: 'Always awake' },
    { id: 'sleep-when-parked', label: 'Sleep when parked' },
    { id: 'scheduled-auto', label: 'Scheduled / Auto' },
  ];

  const privacyModes: { id: PrivacyMode; label: string; desc: string }[] = [
    {
      id: 'friends-only',
      label: 'Friends only',
      desc: 'Only accepted friends participate in proximity encounters.',
    },
    {
      id: 'discoverable',
      label: 'Discoverable',
      desc: 'Future nearby discovery mode for public companion drivers.',
    },
    {
      id: 'invisible',
      label: 'Invisible',
      desc: 'Never broadcast presence or appear in nearby sensing.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage display, privacy, and companion profile
          </Text>
        </View>

        {/* 1. DEVICE SECTION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color="#0F172A" />
            <Text style={styles.sectionTitle}>Device Hardware</Text>
          </View>

          {/* Connection Toggle */}
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>{device.name}</Text>
              <Text style={styles.rowSublabel}>
                Status: {device.state} · Battery {device.battery}%
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.statusToggleButton,
                isConnected && styles.statusToggleConnected,
              ]}
              onPress={handleToggleConnection}
            >
              <Text
                style={[
                  styles.statusToggleText,
                  isConnected && styles.statusToggleTextConnected,
                ]}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reconnect Action */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={reconnectDevice}
            activeOpacity={0.7}
          >
            <Text style={styles.actionRowText}>Reconnect Companion</Text>
            <Ionicons name="refresh-outline" size={18} color="#2563EB" />
          </TouchableOpacity>

          {/* Brightness Slider */}
          <View style={styles.divider} />
          <SliderControl
            value={device.brightness}
            onChange={(val) => setDeviceBrightness(val)}
            label="Display Brightness"
          />

          {/* Sleep Behaviour Selector */}
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Sleep Behaviour</Text>
          <View style={styles.pillSelector}>
            {sleepModes.map((mode) => {
              const active = device.sleepMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[styles.pillOption, active && styles.pillOptionActive]}
                  onPress={() => setDeviceSleepMode(mode.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pillOptionText,
                      active && styles.pillOptionTextActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Firmware Placeholder */}
          <View style={styles.firmwareRow}>
            <Text style={styles.rowSublabel}>Firmware version</Text>
            <Text style={styles.firmwareValue}>{device.firmwareVersion}</Text>
          </View>
        </View>

        {/* 2. CHARACTER SHORTCUT */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.shortcutRow}
            onPress={() => router.push('/(tabs)/character')}
            activeOpacity={0.7}
          >
            <View style={styles.shortcutLeft}>
              <View style={styles.shortcutIcon}>
                <Ionicons name="color-palette-outline" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.shortcutTitle}>Cloud Appearance</Text>
                <Text style={styles.shortcutSubtitle}>
                  Current: {profile.characterName} ({profile.characterColour})
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* 3. NOTIFICATIONS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Friend nearby</Text>
            <Switch
              value={profile.notifications.friendNearby}
              onValueChange={(val) =>
                updateProfile({
                  notifications: { ...profile.notifications, friendNearby: val },
                })
              }
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={profile.notifications.friendNearby ? '#2563EB' : '#F3F4F6'}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Friend approaching</Text>
            <Switch
              value={profile.notifications.friendApproaching}
              onValueChange={(val) =>
                updateProfile({
                  notifications: {
                    ...profile.notifications,
                    friendApproaching: val,
                  },
                })
              }
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={
                profile.notifications.friendApproaching ? '#2563EB' : '#F3F4F6'
              }
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Recognized friend</Text>
            <Switch
              value={profile.notifications.recognizedFriend}
              onValueChange={(val) =>
                updateProfile({
                  notifications: {
                    ...profile.notifications,
                    recognizedFriend: val,
                  },
                })
              }
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={
                profile.notifications.recognizedFriend ? '#2563EB' : '#F3F4F6'
              }
            />
          </View>
        </View>

        {/* 4. PRIVACY */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0F172A" />
            <Text style={styles.sectionTitle}>Privacy & Sensing</Text>
          </View>

          {privacyModes.map((mode) => {
            const isSelected = profile.privacyMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.privacyOption,
                  isSelected && styles.privacyOptionSelected,
                ]}
                onPress={() => updateProfile({ privacyMode: mode.id })}
                activeOpacity={0.8}
              >
                <View style={styles.privacyHeader}>
                  <Text style={styles.privacyLabel}>{mode.label}</Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2563EB"
                    />
                  )}
                </View>
                <Text style={styles.privacyDesc}>{mode.desc}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.locationPlaceholder}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.locationText}>
              Location permission: Authorized when in use (mock)
            </Text>
          </View>
        </View>

        {/* 5. PROFILE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={20} color="#0F172A" />
            <Text style={styles.sectionTitle}>Driver & Vehicle Profile</Text>
          </View>

          <View style={styles.profileInputRow}>
            <Text style={styles.fieldLabel}>Driver Name</Text>
            <TextInput
              style={styles.profileInput}
              value={profile.username}
              onChangeText={(text) => updateProfile({ username: text })}
              placeholder="e.g. Max"
            />
          </View>

          <View style={styles.profileInputRow}>
            <Text style={styles.fieldLabel}>Vehicle Label</Text>
            <TextInput
              style={styles.profileInput}
              value={profile.carName}
              onChangeText={(text) => updateProfile({ carName: text })}
              placeholder="e.g. Audi"
            />
          </View>
        </View>

        {/* 6. ABOUT / DEV TOOLING */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="code-slash-outline" size={20} color="#0F172A" />
            <Text style={styles.sectionTitle}>Developer & Testing Tools</Text>
          </View>

          {/* Test Cloud Emotions */}
          <Text style={styles.fieldLabel}>Test Cloud Reaction</Text>
          <View style={styles.emotionsRow}>
            {emotions.map((emo) => (
              <TouchableOpacity
                key={emo.id}
                style={styles.emotionButton}
                onPress={() => triggerEmotion(emo.id)}
                activeOpacity={0.7}
              >
                <Ionicons name={emo.icon} size={18} color="#4F46E5" />
                <Text style={styles.emotionButtonText}>{emo.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Proximity Simulator Launcher */}
          <TouchableOpacity
            style={styles.devLauncherButton}
            onPress={() => router.push('/simulator')}
            activeOpacity={0.8}
          >
            <Ionicons name="pulse" size={20} color="#FFFFFF" />
            <Text style={styles.devLauncherText}>
              Launch Proximity Simulator
            </Text>
          </TouchableOpacity>

          {/* Demo Reset */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetOnboarding}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>
              Reset Onboarding Flow (Demo)
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            Cloud Companion Mobile · v0.1.0 (Build 2026.09)
          </Text>
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
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.title1,
    color: '#0F172A',
  },
  subtitle: {
    ...Typography.subhead,
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headline,
    color: '#0F172A',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: {
    ...Typography.headline,
    fontSize: 15,
    color: '#111827',
  },
  rowSublabel: {
    ...Typography.subhead,
    color: '#6B7280',
    fontSize: 13,
  },
  statusToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: '#F3F4F6',
  },
  statusToggleConnected: {
    backgroundColor: '#FEE2E2',
  },
  statusToggleText: {
    ...Typography.caption,
    color: '#111827',
    fontWeight: '600',
  },
  statusToggleTextConnected: {
    color: '#DC2626',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionRowText: {
    ...Typography.callout,
    color: '#2563EB',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.callout,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '600',
  },
  pillSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  pillOptionActive: {
    backgroundColor: '#0F172A',
  },
  pillOptionText: {
    ...Typography.caption,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '500',
  },
  pillOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  firmwareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  firmwareValue: {
    ...Typography.caption,
    color: '#9CA3AF',
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    ...Typography.headline,
    color: '#0F172A',
  },
  shortcutSubtitle: {
    ...Typography.caption,
    color: '#6B7280',
  },
  privacyOption: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  privacyOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  privacyLabel: {
    ...Typography.headline,
    fontSize: 15,
    color: '#0F172A',
  },
  privacyDesc: {
    ...Typography.subhead,
    color: '#64748B',
    fontSize: 12,
  },
  locationPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },
  locationText: {
    ...Typography.caption,
    color: '#6B7280',
  },
  profileInputRow: {
    marginBottom: Spacing.sm,
  },
  profileInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...Typography.headline,
    fontSize: 14,
    color: '#111827',
  },
  emotionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  emotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  emotionButtonText: {
    ...Typography.caption,
    color: '#4F46E5',
    fontWeight: '600',
  },
  devLauncherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginVertical: Spacing.sm,
  },
  devLauncherText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontSize: 15,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetButtonText: {
    ...Typography.subhead,
    color: '#DC2626',
    fontWeight: '500',
  },
  versionText: {
    ...Typography.caption,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
