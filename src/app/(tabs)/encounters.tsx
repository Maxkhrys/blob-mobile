import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/AppContext';
import { EncounterCard } from '../../components/encounters/EncounterCard';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function EncountersScreen() {
  const { encounters, clearEncounters } = useAppStore();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Encounters</Text>
          <Text style={styles.subtitle}>
            Moments shared with friends on the road
          </Text>
        </View>
        {encounters.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearEncounters}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Social Memory Feed */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {encounters.map((encounter) => (
          <EncounterCard key={encounter.id} encounter={encounter} />
        ))}

        {encounters.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No encounters yet</Text>
            <Text style={styles.emptySubtitle}>
              When you pass nearby or drive alongside connected friends,
              memories will be saved here.
            </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: '#F3F4F6',
  },
  clearButtonText: {
    ...Typography.caption,
    color: '#6B7280',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.headline,
    color: '#374151',
  },
  emptySubtitle: {
    ...Typography.subhead,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
