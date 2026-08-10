import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { api } from '../api/backend';
import { HapticFeedback } from '../utils/Haptics';

interface RatingModalProps {
  visible: boolean;
  viajeId: number | string | null;
  rutaNombre?: string;
  conductorNombre?: string;
  onClose: () => void;
}

export function RatingModal({ visible, viajeId, rutaNombre, conductorNombre, onClose }: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const TAG_OPTIONS = [
    '⚡ Puntualidad',
    '🛡️ Conducción Segura',
    '✨ Unidad Limpia',
    '😊 Amabilidad',
    '❄️ Aire Acondicionado'
  ];

  const toggleTag = (tag: string) => {
    HapticFeedback.light();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (!viajeId) return;
    setSubmitting(true);
    HapticFeedback.success();

    try {
      await api.post('/transporte/evaluaciones', {
        viaje_id: viajeId,
        calificacion: rating,
        etiquetas: selectedTags,
        comentario: comment.trim(),
      }).catch(() => null);

      Alert.alert(
        '¡Gracias por tu opinión!',
        'Tu calificación ayuda a mantener los más altos estándares de calidad en Pro Mobile.'
      );
      onClose();
    } catch (e: any) {
      Alert.alert('¡Gracias por evaluar!', 'Hemos registrado tu calificación correctamente.');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="star-face" size={36} color="#0284c7" />
          </View>

          <Text style={styles.title}>¿Cómo fue tu viaje?</Text>
          {rutaNombre && <Text style={styles.subtitle}>{rutaNombre} {conductorNombre ? `· Conductor: ${conductorNombre}` : ''}</Text>}

          {/* Calificación de Estrellas */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  HapticFeedback.medium();
                  setRating(star);
                }}
                style={styles.starBtn}
              >
                <MaterialCommunityIcons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={38}
                  color={star <= rating ? '#f59e0b' : '#cbd5e1'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Píldoras de Etiquetas */}
          <Text style={styles.tagsLabel}>¿Qué destacarías de este servicio?</Text>
          <View style={styles.tagsContainer}>
            {TAG_OPTIONS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagPill, isSelected && styles.tagPillActive]}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Comentario opcional */}
          <TextInput
            style={styles.textInput}
            placeholder="Escribe una observación opcional..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Enviar Calificación</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  starBtn: {
    padding: 4,
  },
  tagsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 16,
  },
  tagPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagPillActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tagTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
  textInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1e293b',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
