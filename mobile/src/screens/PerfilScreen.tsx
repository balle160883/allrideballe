import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Alert, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PerfilScreen() {
  const { user, signOut, proximityAlertsEnabled, setProximityAlertsEnabled } = useAuth();
  const isConductor = user?.rol === 'conductor';
  const isPasajero = user?.rol === 'pasajero';

  const handleSOS = () => {
    Alert.alert(
      '🚨 EMERGENCIA',
      '¿Deseas enviar una alerta de emergencia? Esto notificará inmediatamente al departamento de seguridad.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar Alerta', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '✅ Alerta Enviada',
              'Tu alerta de emergencia ha sido registrada. El equipo de seguridad se pondrá en contacto contigo.'
            );
          }
        },
      ]
    );
  };

  const handleContactarSoporte = () => {
    Alert.alert(
      'Contactar Soporte',
      '¿Cómo deseas contactarnos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Llamar',
          onPress: () => Linking.openURL('tel:+523312345678')
        },
        { 
          text: 'Email',
          onPress: () => Linking.openURL('mailto:soporte@allride.com')
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Botón SOS para pasajeros */}
      {isPasajero && (
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <MaterialCommunityIcons name="alert-circle" size={28} color="#fff" />
          <Text style={styles.sosButtonText}>BOTÓN DE EMERGENCIA</Text>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons 
            name={isConductor ? 'account-tie' : 'account'} 
            size={44} 
            color={Colors.primary} 
          />
        </View>
        <Text style={styles.name}>{user?.gestor || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.rol && (
          <View style={[styles.roleBadge, isConductor && styles.roleBadgeConductor]}>
            <MaterialCommunityIcons 
              name={isConductor ? 'bus' : 'account'} 
              size={14} 
              color={isConductor ? '#fff' : '#1e40af'} 
            />
            <Text style={[styles.roleText, isConductor && styles.roleTextConductor]}>
              {user.rol.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Sección de configuración */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>CONFIGURACIÓN</Text>
      </View>

      <View style={styles.section}>
        {isPasajero && (
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
        )}
        
        <TouchableOpacity style={styles.menuItem} onPress={handleContactarSoporte}>
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="headset" size={20} color={Colors.textMuted} />
            <Text style={styles.menuItemText}>Contactar Soporte</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="help-circle-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.menuItemText}>Preguntas Frecuentes</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
        </TouchableOpacity>
      </View>

      {/* Sección de información */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.menuItemText}>Política de Privacidad</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
        </View>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.menuItemText}>Términos y Condiciones</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
        </View>
      </View>

      {/* Botón de cerrar sesión */}
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
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.error,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 16,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  header: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.primary + '20',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
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
    fontWeight: '900',
    color: Colors.textMuted,
    letterSpacing: 1.5,
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
    fontWeight: '500',
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
    fontWeight: '700',
    color: Colors.error,
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadgeConductor: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roleTextConductor: {
    color: '#fff',
  },
});
