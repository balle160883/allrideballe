import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Visita } from '../hooks/useVisitas';

interface Props {
  visita: Visita;
  onPress: (visita: Visita) => void;
}

export default function VisitaCard({ visita, onPress }: Props) {
  const isSocio = visita.tipo === 'Socio';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(visita)}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: isSocio ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.badgeText, { color: isSocio ? '#166534' : '#92400e' }]}>
                {visita.tipo}
            </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cuenta}>Cuenta: {visita.numCuenta}</Text>
          <Text style={styles.socioId}>Socio/Aval: {visita.socioId}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="account" size={18} color={Colors.primary} />
          <Text style={styles.nombre} numberOfLines={1}>{visita.nombre}</Text>
        </View>

        <View style={styles.row}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={Colors.secondary} />
          <Text style={styles.domicilio} numberOfLines={2}>{visita.domicilio || 'Sin domicilio registrado'}</Text>
        </View>

        {visita.cruces ? (
          <View style={styles.row}>
            <MaterialCommunityIcons name="directions-fork" size={18} color={Colors.secondary} />
            <Text style={[styles.domicilio, { fontSize: 13 }]} numberOfLines={2}>Cruces: {visita.cruces}</Text>
          </View>
        ) : null}

        {visita.municipio ? (
          <View style={styles.row}>
            <MaterialCommunityIcons name="city-variant-outline" size={18} color={Colors.secondary} />
            <Text style={[styles.domicilio, { fontSize: 13 }]} numberOfLines={1}>{visita.municipio}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
           <View style={styles.moraInfo}>
              <Text style={styles.moraLabel}>Mora:</Text>
              <Text style={styles.moraValue}>${visita.saldoAlDia.toFixed(2)}</Text>
           </View>
           <View style={styles.diasInfo}>
              <Text style={styles.diasLabel}>Días:</Text>
              <Text style={styles.diasValue}>{visita.diasMora}</Text>
           </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cuenta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  socioId: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  content: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  domicilio: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  moraInfo: {
    flex: 1,
  },
  moraLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  moraValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.error,
  },
  diasInfo: {
    flex: 1,
  },
  diasLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  diasValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.accent,
  },
});
