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
import { CloudPreview } from '../components/character/CloudPreview';
import { ColourSwatchPicker } from '../components/character/ColourSwatchPicker';
import { EnvironmentPicker } from '../components/character/EnvironmentPicker';
import { CloudColourId, EnvironmentId } from '../types';
import { Radius, Spacing, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, completeOnboarding } = useAppStore();

  const [step, setStep] = useState(0);

  // Form states
  const [username, setUsername] = useState(profile.username || 'Max');
  const [carName, setCarName] = useState(profile.carName || 'Audi');
  const [characterName, setCharacterName] = useState(
    profile.characterName || 'Lumi'
  );
  const [characterColour, setCharacterColour] = useState<CloudColourId>(
    profile.characterColour || 'blue'
  );
  const [environment, setEnvironment] = useState<EnvironmentId>(
    profile.environment || 'zen'
  );

  // Device pairing simulation
  const [pairingState, setPairingState] = useState<
    'idle' | 'searching' | 'found' | 'connected'
  >('idle');

  const totalSteps = 6;

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      if (step === 4) {
        // Moving into device pairing step: start searching simulation
        setStep(step + 1);
        setPairingState('searching');
        setTimeout(() => {
          setPairingState('found');
        }, 1500);
      } else {
        setStep(step + 1);
      }
    } else {
      // Finalize
      await completeOnboarding({
        username: username.trim() || 'Max',
        carName: carName.trim() || 'Audi',
        characterName: characterName.trim() || 'Lumi',
        characterColour,
        environment,
      });
      router.replace('/(tabs)');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleConnectDemoDevice = () => {
    setPairingState('connected');
    setTimeout(async () => {
      await completeOnboarding({
        username: username.trim() || 'Max',
        carName: carName.trim() || 'Audi',
        characterName: characterName.trim() || 'Lumi',
        characterColour,
        environment,
      });
      router.replace('/(tabs)');
    }, 900);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress header */}
      <View style={styles.header}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        )}
        <View style={styles.progressBarContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressBarSegment,
                i <= step && styles.progressBarSegmentActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepCounter}>
          {step + 1}/{totalSteps}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 0: WELCOME */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.previewHero}>
              <CloudPreview colourId={characterColour} size={200} emotion="happy" />
            </View>
            <Text style={styles.heroTitle}>Meet your companion</Text>
            <Text style={styles.heroSubtitle}>
              A little companion that knows when your people are nearby.
            </Text>
            <View style={styles.featureNote}>
              <Ionicons name="car-outline" size={20} color="#6B7280" />
              <Text style={styles.featureNoteText}>
                Crafted for your car, paired with your phone.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 1: YOUR PROFILE */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Driver Profile</Text>
            <Text style={styles.stepDescription}>
              How your friends will recognize you on the road.
            </Text>

            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {username ? username[0].toUpperCase() : 'M'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driver Name</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. Max"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        {/* STEP 2: YOUR CAR */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Vehicle</Text>
            <Text style={styles.stepDescription}>
              Give your car a friendly label for proximity encounters.
            </Text>

            <View style={styles.iconCircle}>
              <Ionicons name="car-sport-outline" size={44} color="#0F172A" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Car Name / Model</Text>
              <TextInput
                style={styles.textInput}
                value={carName}
                onChangeText={setCarName}
                placeholder="e.g. Audi, My A5, Blue Golf"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        {/* STEP 3: MEET YOUR CLOUD */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Meet Your Cloud</Text>
            <Text style={styles.stepDescription}>
              Cloud is your personal companion. Name it and choose its hue.
            </Text>

            <View style={styles.previewHeroCompact}>
              <CloudPreview
                colourId={characterColour}
                size={180}
                emotion="curious"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Companion Name</Text>
              <TextInput
                style={styles.textInput}
                value={characterName}
                onChangeText={setCharacterName}
                placeholder="e.g. Lumi"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <ColourSwatchPicker
              selectedColour={characterColour}
              onSelectColour={setCharacterColour}
            />
          </View>
        )}

        {/* STEP 4: ENVIRONMENT */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Display Ambience</Text>
            <Text style={styles.stepDescription}>
              Choose the ambient styling for your Cloud companion display.
            </Text>

            <EnvironmentPicker
              selectedEnvironment={environment}
              onSelectEnvironment={setEnvironment}
            />
          </View>
        )}

        {/* STEP 5: DEVICE PAIRING */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Connect Display</Text>
            <Text style={styles.stepDescription}>
              Pairing your mobile app with the physical Cloud display.
            </Text>

            <View style={styles.pairingCard}>
              {pairingState === 'searching' && (
                <>
                  <ActivityIndicator
                    size="large"
                    color="#2563EB"
                    style={{ marginBottom: Spacing.md }}
                  />
                  <Text style={styles.pairingStatusText}>
                    Searching for nearby Cloud display...
                  </Text>
                  <Text style={styles.pairingSubtext}>
                    Hold your phone near the companion device
                  </Text>
                </>
              )}

              {pairingState === 'found' && (
                <>
                  <View style={styles.deviceFoundCircle}>
                    <Ionicons name="hardware-chip-outline" size={36} color="#10B981" />
                  </View>
                  <Text style={styles.pairingDeviceName}>
                    Cloud Display (Demo)
                  </Text>
                  <Text style={styles.pairingSubtext}>
                    Signal strength: Excellent · Bluetooth LE
                  </Text>
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={handleConnectDemoDevice}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="bluetooth-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.connectButtonText}>
                      Connect Demo Device
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {pairingState === 'connected' && (
                <>
                  <View style={styles.connectedCircle}>
                    <Ionicons name="checkmark" size={38} color="#FFFFFF" />
                  </View>
                  <Text style={styles.pairingDeviceName}>Connected!</Text>
                  <Text style={styles.pairingSubtext}>
                    Setting up your companion...
                  </Text>
                </>
              )}

              {pairingState === 'idle' && (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => {
                    setPairingState('searching');
                    setTimeout(() => setPairingState('found'), 1200);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.connectButtonText}>
                    Search for Device
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footer}>
        {step < totalSteps - 1 ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {step === 0 ? 'Get Started' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              pairingState !== 'connected' && styles.primaryButtonSecondary,
            ]}
            onPress={handleConnectDemoDevice}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {pairingState === 'connected'
                ? 'Complete Setup'
                : 'Connect & Finish'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  backButton: {
    padding: 6,
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressBarSegmentActive: {
    backgroundColor: '#0F172A',
  },
  stepCounter: {
    ...Typography.caption,
    color: '#6B7280',
    fontWeight: '600',
  },
  scrollContent: {
    paddingVertical: Spacing.md,
  },
  stepContainer: {
    paddingHorizontal: Spacing.md,
  },
  previewHero: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  previewHeroCompact: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  heroTitle: {
    ...Typography.hero,
    textAlign: 'center',
    color: '#0F172A',
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: '#6B7280',
    maxWidth: 320,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  featureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
    alignSelf: 'center',
  },
  featureNoteText: {
    ...Typography.subhead,
    color: '#4B5563',
    fontWeight: '500',
  },
  stepTitle: {
    ...Typography.title1,
    color: '#0F172A',
    marginBottom: 4,
  },
  stepDescription: {
    ...Typography.body,
    color: '#6B7280',
    marginBottom: Spacing.lg,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: Spacing.md,
  },
  avatarLetter: {
    ...Typography.hero,
    color: '#FFFFFF',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: Spacing.lg,
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
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Typography.headline,
    color: '#111827',
  },
  pairingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginVertical: Spacing.md,
  },
  pairingStatusText: {
    ...Typography.headline,
    color: '#0F172A',
    marginBottom: 4,
  },
  pairingSubtext: {
    ...Typography.subhead,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  deviceFoundCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  connectedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  pairingDeviceName: {
    ...Typography.title2,
    color: '#0F172A',
    marginBottom: 4,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  connectButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F8F9FA',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: Radius.full,
  },
  primaryButtonSecondary: {
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
