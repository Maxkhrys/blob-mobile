import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/AppContext';
import { Radius, Spacing, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AddDriverModal() {
  const router = useRouter();
  const { addDriver } = useAppStore();

  const [activeTab, setActiveTab] = useState<'code' | 'qr' | 'nearby'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [driverName, setDriverName] = useState('');
  const [carName, setCarName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddWithCode = async () => {
    if (!driverName.trim() && !inviteCode.trim()) {
      setError('Please enter a driver name or invite code.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(async () => {
      const name =
        driverName.trim() ||
        (inviteCode.toUpperCase().includes('ALEX')
          ? 'Alex'
          : inviteCode.toUpperCase().includes('JORDAN')
          ? 'Jordan'
          : `Driver ${inviteCode.toUpperCase()}`);

      const vehicle = carName.trim() || 'Companion Vehicle';

      await addDriver(name, vehicle);
      setLoading(false);
      router.back();
    }, 600);
  };

  const handleQuickAdd = async (name: string, vehicle: string) => {
    setLoading(true);
    setTimeout(async () => {
      await addDriver(name, vehicle);
      setLoading(false);
      router.back();
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'code' && styles.tabItemActive]}
          onPress={() => setActiveTab('code')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'code' && styles.tabTextActive,
            ]}
          >
            Invite Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'qr' && styles.tabItemActive]}
          onPress={() => setActiveTab('qr')}
        >
          <Text
            style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}
          >
            QR Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'nearby' && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab('nearby')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'nearby' && styles.tabTextActive,
            ]}
          >
            Nearby
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'code' && (
          <View style={styles.content}>
            <Text style={styles.heading}>Enter Driver Invite Code</Text>
            <Text style={styles.subheading}>
              Connect with another driver using their personal share code.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Invite Code</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="e.g. CLOUD-7X"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driver Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={driverName}
                onChangeText={setDriverName}
                placeholder="e.g. Taylor"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vehicle Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={carName}
                onChangeText={setCarName}
                placeholder="e.g. BMW M2"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddWithCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Connect Driver</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Shortcuts */}
            <View style={styles.demoSection}>
              <Text style={styles.demoLabel}>Or tap a demo companion:</Text>
              <View style={styles.demoButtons}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleQuickAdd('Jordan', 'Porsche Macan')}
                >
                  <Text style={styles.demoChipText}>+ Add Jordan (Macan)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleQuickAdd('Morgan', 'Tesla Model 3')}
                >
                  <Text style={styles.demoChipText}>+ Add Morgan (Model 3)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'qr' && (
          <View style={styles.centerContent}>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={96} color="#0F172A" />
            </View>
            <Text style={styles.heading}>Scan Companion QR</Text>
            <Text style={styles.subheading}>
              {"Point camera at another driver's Cloud companion screen to pair."}
            </Text>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handleQuickAdd('Casey', 'Mercedes A35')}
            >
              <Text style={styles.submitButtonText}>Simulate QR Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'nearby' && (
          <View style={styles.centerContent}>
            <View style={styles.nearbyCircle}>
              <Ionicons name="radio-outline" size={64} color="#3B82F6" />
            </View>
            <Text style={styles.heading}>Nearby Discovery</Text>
            <Text style={styles.subheading}>
              Searching for Cloud companion devices broadcasting nearby...
            </Text>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handleQuickAdd('Riley', 'VW Golf GTI')}
            >
              <Text style={styles.submitButtonText}>Pair Discovered Driver</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: Radius.full,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    ...Typography.caption,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  content: {
    paddingTop: Spacing.sm,
  },
  centerContent: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  heading: {
    ...Typography.title2,
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    ...Typography.body,
    color: '#6B7280',
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.callout,
    color: '#4B5563',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Typography.headline,
    color: '#111827',
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 15,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.sm,
    width: '100%',
  },
  submitButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontSize: 15,
  },
  demoSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  demoLabel: {
    ...Typography.caption,
    color: '#6B7280',
    marginBottom: Spacing.sm,
  },
  demoButtons: {
    gap: 8,
  },
  demoChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  demoChipText: {
    ...Typography.callout,
    color: '#4338CA',
    fontWeight: '600',
  },
  qrPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: Radius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  nearbyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
});
