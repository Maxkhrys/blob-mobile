import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/AppContext';
import { CloudPreview } from '../../components/character/CloudPreview';
import { ColourSwatchPicker } from '../../components/character/ColourSwatchPicker';
import { EnvironmentPicker } from '../../components/character/EnvironmentPicker';
import { Radius, Spacing, Typography } from '../../constants/theme';

export default function CharacterScreen() {
  const { profile, updateProfile, cloudEmotion } = useAppStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Companion</Text>
          <Text style={styles.subtitle}>
            Cloud appearance and device display ambience
          </Text>
        </View>

        {/* Live Interactive Character Preview */}
        <View style={styles.previewContainer}>
          <CloudPreview
            colourId={profile.characterColour}
            emotion={cloudEmotion}
            size={220}
          />
        </View>

        {/* Companion Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Companion Name</Text>
          <TextInput
            style={styles.nameInput}
            value={profile.characterName}
            onChangeText={(text) => updateProfile({ characterName: text })}
            placeholder="e.g. Lumi"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Cloud Colour Swatches */}
        <ColourSwatchPicker
          selectedColour={profile.characterColour}
          onSelectColour={(colour) => updateProfile({ characterColour: colour })}
        />

        {/* Environment Presets */}
        <EnvironmentPicker
          selectedEnvironment={profile.environment}
          onSelectEnvironment={(env) => updateProfile({ environment: env })}
        />
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
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.callout,
    color: '#6B7280',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Typography.headline,
    color: '#111827',
  },
});
