import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing } from '../constants/theme';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Animated.View style={[styles.avatar, { opacity }]} />
        <View style={styles.textColumn}>
          <Animated.View style={[styles.lineTitle, { opacity }]} />
          <Animated.View style={[styles.lineSub, { opacity }]} />
          <Animated.View style={[styles.lineSubShort, { opacity }]} />
        </View>
        <Animated.View style={[styles.badge, { opacity }]} />
      </View>

      <View style={styles.detailsRow}>
        <Animated.View style={[styles.detailPill, { opacity }]} />
        <Animated.View style={[styles.detailPill, { opacity }]} />
        <Animated.View style={[styles.detailPill, { opacity }]} />
      </View>

      <Animated.View style={[styles.button, { opacity }]} />
    </View>
  );
}

export function SkeletonList() {
  return (
    <View style={styles.container}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  textColumn: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  lineTitle: {
    height: 18,
    width: '70%',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  lineSub: {
    height: 14,
    width: '90%',
    backgroundColor: '#cbd5e1',
    borderRadius: 4,
  },
  lineSubShort: {
    height: 14,
    width: '60%',
    backgroundColor: '#cbd5e1',
    borderRadius: 4,
  },
  badge: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  detailPill: {
    height: 20,
    width: 70,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    marginTop: 16,
  },
});
