import { useState, useEffect } from 'react';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';

// Interfaz para una parada de la ruta
export interface Parada {
  orden: number;
  nombre: string;
  latitud: number;
  longitud: number;
}

// Interfaz para la ubicación del autobús
export interface UbicacionAutobus {
  latitud: number;
  longitud: number;
  velocidad?: number;
  timestamp: string;
}

// Interfaz limpia de transporte corporativo (Reserva del pasajero)
export interface Viaje {
  id: string;
  reserva_id: number;
  viaje_id: number;
  ruta_nombre: string;
  conductor_nombre: string;
  origen: string;
  destino: string;
  paradas: Parada[];
  estado: string;         // 'programado' | 'en_ruta' | 'completado' | 'cancelado'
  viaje_estado: string;
  patente: string;        // Matrícula del vehículo
  modelo: string;         // Descripción del vehículo
  capacidad: number;      // Asientos totales
  fecha_hora_salida: number; // timestamp ms
  ultima_ubicacion?: UbicacionAutobus;
  asiento_numero: number;
  reserva_estado: string;
  isRealizada: boolean;   // true si estado === 'completado'
}

export function useViajes() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchViajes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isConductor = user.rol === 'conductor';
      const endpoint = isConductor ? '/transporte/viajes' : '/transporte/reservas/pasajero';
      const data = await api.get(endpoint);
      
      const mapped: Viaje[] = (data || []).map((v: any) => {
        if (isConductor) {
          return {
            id: v.id.toString(),
            reserva_id: 0,
            viaje_id: v.id,
            ruta_nombre: v.ruta_nombre || 'Ruta sin nombre',
            conductor_nombre: v.conductor_nombre || 'Sin conductor asignado',
            origen: v.origen || 'Origen no especificado',
            destino: v.destino || 'Destino no especificado',
            paradas: v.paradas || [],
            estado: v.estado || 'programado',
            viaje_estado: v.estado || 'programado',
            patente: v.patente || 'S/P',
            modelo: v.modelo || 'Unidad',
            capacidad: v.capacidad || 30,
            fecha_hora_salida: new Date(v.fecha_hora_salida).getTime(),
            ultima_ubicacion: undefined,
            asiento_numero: 0,
            reserva_estado: 'confirmado',
            isRealizada: v.estado === 'completado',
          };
        } else {
          return {
            id: v.reserva_id.toString(),
            reserva_id: v.reserva_id,
            viaje_id: v.viaje_id,
            ruta_nombre: v.ruta_nombre || 'Ruta sin nombre',
            conductor_nombre: v.conductor_nombre || 'Sin conductor asignado',
            origen: v.origen || 'Origen no especificado',
            destino: v.destino || 'Destino no especificado',
            paradas: v.paradas || [],
            estado: v.viaje_estado || 'programado',
            viaje_estado: v.viaje_estado || 'programado',
            patente: v.patente || 'S/P',
            modelo: v.modelo || 'Unidad',
            capacidad: v.capacidad || 30,
            fecha_hora_salida: new Date(v.fecha_hora_salida).getTime(),
            ultima_ubicacion: v.ultima_ubicacion ? {
              latitud: Number(v.ultima_ubicacion.latitud),
              longitud: Number(v.ultima_ubicacion.longitud),
              velocidad: v.ultima_ubicacion.velocidad ? Number(v.ultima_ubicacion.velocidad) : undefined,
              timestamp: v.ultima_ubicacion.timestamp
            } : undefined,
            asiento_numero: v.asiento_numero,
            reserva_estado: v.reserva_estado,
            isRealizada: v.viaje_estado === 'completado',
          };
        }
      });
      setViajes(mapped);
    } catch (e) {
      console.error('Error fetching viajes:', e);
    } finally {
      setLoading(false);
    }
  };

  const calificarViaje = async (viajeId: number, reservaId: number, calificacion: number, comentario?: string) => {
    try {
      await api.post(`/transporte/calificaciones`, {
        viaje_id: viajeId,
        reserva_id: reservaId,
        calificacion,
        comentario
      });
      return { success: true };
    } catch (e) {
      console.error('Error calificando viaje:', e);
      throw e;
    }
  };

  useEffect(() => { fetchViajes(); }, [user]);

  return { viajes, loading, refresh: fetchViajes, calificarViaje };
}

export function useGroupedViajes() {
  const { viajes, loading, refresh } = useViajes();

  const sections = viajes.reduce((acc: any[], v: Viaje) => {
    const groupTitle = v.destino;
    const section = acc.find(s => s.title === groupTitle);
    if (section) {
      section.data.push(v);
    } else {
      acc.push({ title: groupTitle, data: [v] });
    }
    return acc;
  }, []);

  return { sections, loading, refresh };
}

// Alias de compatibilidad para hooks existentes que aún usen Visita
export type Visita = Viaje;
export const useVisitas = useViajes;
export const useGroupedVisitas = useGroupedViajes;
