import * as Haptics from 'expo-haptics';

export const HapticFeedback = {
  // Vibración suave para toques de botones simples o pestañas
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorar en plataformas no compatibles
    }
  },

  // Vibración media para acciones de confirmación
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignorar
    }
  },

  // Vibración fuerte para emergencias (botón SOS)
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Ignorar
    }
  },

  // Patrón de éxito (ej. reserva aprobada / enviada)
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignorar
    }
  },

  // Patrón de error
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignorar
    }
  },
};
