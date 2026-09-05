import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { CloudColourId } from '../../types';
import { CLOUD_COLOUR_PRESETS } from '../../constants/palettes';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface ColourSwatchPickerProps {
  selectedColour: CloudColourId;
  onSelectColour: (id: CloudColourId) => void;
}

export const ColourSwatchPicker: React.FC<ColourSwatchPickerProps> = ({
  selectedColour,
  onSelectColour,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cloud Colour</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CLOUD_COLOUR_PRESETS.map((preset) => {
          const isSelected = selectedColour === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.swatchCard,
                isSelected && styles.swatchCardSelected,
              ]}
              onPress={() => onSelectColour(preset.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.swatchCircle,
                  {
                    backgroundColor: preset.primary,
                    borderColor: preset.border,
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={preset.accent} />
                )}
              </View>
              <Text
                style={[
                  styles.swatchLabel,
                  isSelected && styles.swatchLabelSelected,
                ]}
                numberOfLines={1}
              >
                {preset.label.replace('Cloud ', '')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  title: {
    ...Typography.callout,
    color: '#6B7280',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: 12,
  },
  swatchCard: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    minWidth: 80,
  },
  swatchCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  swatchCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  swatchLabel: {
    ...Typography.caption,
    color: '#4B5563',
    fontWeight: '500',
  },
  swatchLabelSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
