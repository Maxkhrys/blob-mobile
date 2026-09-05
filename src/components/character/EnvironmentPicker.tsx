import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EnvironmentId } from '../../types';
import { ENVIRONMENT_PRESETS } from '../../constants/environments';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface EnvironmentPickerProps {
  selectedEnvironment: EnvironmentId;
  onSelectEnvironment: (id: EnvironmentId) => void;
}

export const EnvironmentPicker: React.FC<EnvironmentPickerProps> = ({
  selectedEnvironment,
  onSelectEnvironment,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Environment</Text>
      <View style={styles.grid}>
        {ENVIRONMENT_PRESETS.map((env) => {
          const isSelected = selectedEnvironment === env.id;
          return (
            <TouchableOpacity
              key={env.id}
              style={[
                styles.envCard,
                { backgroundColor: env.bgColor },
                isSelected && styles.envCardSelected,
              ]}
              onPress={() => onSelectEnvironment(env.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: env.accentColor },
                  ]}
                />
                <Text style={[styles.envLabel, { color: env.textColor }]}>
                  {env.label}
                </Text>
                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={env.accentColor}
                  />
                ) : (
                  <View style={styles.radioPlaceholder} />
                )}
              </View>
              <Text
                style={[styles.envDescription, { color: env.textColor }]}
                numberOfLines={2}
              >
                {env.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  title: {
    ...Typography.callout,
    color: '#6B7280',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    gap: 10,
  },
  envCard: {
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  envCardSelected: {
    borderColor: '#0F172A',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  envLabel: {
    ...Typography.headline,
    flex: 1,
    fontSize: 16,
  },
  radioPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  envDescription: {
    ...Typography.subhead,
    opacity: 0.8,
    fontSize: 13,
    paddingLeft: 16,
  },
});
