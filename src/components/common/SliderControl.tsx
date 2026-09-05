import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface SliderControlProps {
  value: number; // 0 - 100
  onChange: (val: number) => void;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  value,
  onChange,
  label = 'Brightness',
  icon = 'sunny-outline',
}) => {
  const steps = [20, 40, 60, 80, 100];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={18} color="#6B7280" />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.valueText}>{Math.round(value)}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%` }]} />
      </View>

      {/* Preset step buttons */}
      <View style={styles.stepsRow}>
        {steps.map((step) => (
          <TouchableOpacity
            key={step}
            style={[
              styles.stepButton,
              Math.abs(value - step) < 10 && styles.stepButtonActive,
            ]}
            onPress={() => onChange(step)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.stepText,
                Math.abs(value - step) < 10 && styles.stepTextActive,
              ]}
            >
              {step}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...Typography.headline,
    fontSize: 15,
    color: '#111827',
  },
  valueText: {
    ...Typography.callout,
    color: '#3B82F6',
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: Radius.full,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    backgroundColor: '#F3F4F6',
  },
  stepButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  stepText: {
    ...Typography.caption,
    color: '#6B7280',
    fontSize: 11,
  },
  stepTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
});
