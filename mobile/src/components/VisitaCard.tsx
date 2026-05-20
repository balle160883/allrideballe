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
  const isEnProgreso = visita.situacion === 'en_progreso';
  const isProgramado = visita.situacion === 'programado';
  const isFinalizado = visita.situacion === 'finalizado';

  // Obtener color del badge
  let badgeBg = '#f1f5f9';
  let badgeColor = '#475569';
  if (isEnProgreso) {
    badgeBg = '#dbeafe';
    badgeColor = '#2563eb';
  } else if (isProgramado) {
    badgeBg = '#fef3c7';
    badgeColor = '#d97706';
  } else if (isFinalizado) {
    badgeBg = '#dcfce7';
    badgeColor = '#166534';
  }

  // Formatear fecha y hora
  const dateStr = new Date(visita.diasMora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateDay = new Date(visita.diasMora).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(visita)}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>
                {visita.tipo}
            </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cuenta}>Viaje #{visita.numCuenta}</Text>
          <Text style={styles.socioId}>Unidad: {visita.socioId}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="bus" size={20} color={Colors.primary} />
          <Text style={styles.nombre} numberOfLines={1}>{visita.nombre}</Text>
        </View>

        <View style={styles.row}>
          <MaterialCommunityIcons name="map-marker-distance" size={18} color={Colors.secondary} />
          <Text style={styles.domicilio} numberOfLines={2}>
            {visita.domicilio} → {visita.colonia}
          </Text>
        </View>

        <View style={styles.row}>
          <MaterialCommunityIcons name="account-tie" size={18} color={Colors.secondary} />
          <Text style={[styles.domicilio, { fontSize: 13 }]} numberOfLines={1}>
            Chofer: {visita.nombreSocio}
          </Text>
        </View>

        <View style={styles.footer}>
           <View style={styles.timeInfo}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.timeText}>Salida: {dateDay} - {dateStr}</Text>
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
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cuenta: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  socioId: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  content: {
    gap: Spacing.xs,
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
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
});
