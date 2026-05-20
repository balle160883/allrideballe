import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Viaje } from '../hooks/useVisitas';

interface Props {
  viaje: Viaje;
  onPress: (viaje: Viaje) => void;
}

export default function ViajeCard({ viaje, onPress }: Props) {
  const isEnRuta = viaje.estado === 'en_ruta';
  const isProgramado = viaje.estado === 'programado';
  const isCompletado = viaje.estado === 'completado';
  const isCancelado = viaje.estado === 'cancelado';

  const badgeConfig = isEnRuta
    ? { bg: '#dbeafe', color: '#1d4ed8', label: 'En Ruta', icon: 'bus-clock' as const }
    : isProgramado
    ? { bg: '#fef3c7', color: '#b45309', label: 'Programado', icon: 'clock-outline' as const }
    : isCancelado
    ? { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado', icon: 'cancel' as const }
    : { bg: '#dcfce7', color: '#166534', label: 'Completado', icon: 'check-circle-outline' as const };

  const salida = new Date(viaje.fecha_hora_salida);
  const timeStr = salida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = salida.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity
      style={[styles.card, isEnRuta && styles.cardActive]}
      onPress={() => onPress(viaje)}
      activeOpacity={0.75}
    >
      {/* Barra de acento lateral */}
      <View style={[styles.accentBar, { backgroundColor: badgeConfig.color }]} />

      <View style={styles.body}>
        {/* Fila superior: badge + ID */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: badgeConfig.bg }]}>
            <MaterialCommunityIcons name={badgeConfig.icon} size={12} color={badgeConfig.color} />
            <Text style={[styles.badgeText, { color: badgeConfig.color }]}>{badgeConfig.label}</Text>
          </View>
          <Text style={styles.tripId}>#{viaje.id} · {viaje.patente}</Text>
        </View>

        {/* Nombre de la ruta */}
        <Text style={styles.rutaNombre} numberOfLines={1}>{viaje.ruta_nombre}</Text>

        {/* Origen → Destino */}
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <Text style={styles.routeText} numberOfLines={1}>{viaje.origen}</Text>
        </View>
        <View style={[styles.routeRow, { marginTop: 2 }]}>
          <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primary} />
          <Text style={[styles.routeText, { color: Colors.primary, fontWeight: '700' }]} numberOfLines={1}>
            {viaje.destino}
          </Text>
        </View>

        {/* Footer: conductor + hora */}
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons name="account-tie" size={14} color={Colors.textMuted} />
            <Text style={styles.footerText} numberOfLines={1}>{viaje.conductor_nombre}</Text>
          </View>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.footerText}>{dateStr} · {timeStr}</Text>
          </View>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.border} style={styles.chevron} />
    </TouchableOpacity>
  );
}

// Mantener alias VisitaCard para compatibilidad con imports existentes
export const VisitaCard = ViajeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardActive: {
    borderColor: '#bfdbfe',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    elevation: 5,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    padding: Spacing.md,
    paddingLeft: Spacing.sm + 4,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripId: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  rutaNombre: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    marginLeft: 4,
  },
  routeText: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  chevron: {
    paddingRight: Spacing.sm,
  },
});
