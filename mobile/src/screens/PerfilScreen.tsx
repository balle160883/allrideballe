import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PerfilScreen() {
  const { user, signOut, proximityAlertsEnabled, setProximityAlertsEnabled } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.name}>{user?.gestor || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.rol && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.rol.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>CONFIGURACIÓN</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="bell-ring-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.menuItemText}>Alertas de Proximidad</Text>
          </View>
          <Switch
            value={proximityAlertsEnabled}
            onValueChange={setProximityAlertsEnabled}
            trackColor={{ false: '#cbd5e1', true: Colors.primary + '80' }}
            thumbColor={proximityAlertsEnabled ? Colors.primary : '#f4f3f4'}
          />
        </View>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.menuItemText}>Otros Ajustes</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  email: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  section: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.border,
    borderBottomColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  logoutButtonText: {
    marginLeft: Spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  roleText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
