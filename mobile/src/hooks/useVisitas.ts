import { useState, useEffect } from 'react';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';

export interface Visita {
  id: string; 
  numCuenta: string; // ID del viaje
  nombre: string; // Nombre de la Ruta
  nombreSocio?: string; // Nombre del Conductor
  domicilio: string; // Origen
  colonia: string; // Destino
  tipo: string; // Estado del viaje
  socioId: string; // Vehículo patente
  saldoTotal: number; // Capacidad de pasajeros
  saldoAlDia: number; // Pasajeros reservados
  diasMora: number; // Hora de salida (minutos desde hoy/timestamp)
  telefonos: string; // Vehículo descripción
  situacion: string; // Estado del viaje
  latitud?: number;
  longitud?: number;
  isRealizada: boolean;
}

export function useVisitas() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchVisitas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Obtener los viajes del sistema
      const viajesData = await api.get('/transporte/viajes');
      
      const mapped: Visita[] = (viajesData || []).map((viaje: any) => {
        return {
          id: viaje.id.toString(),
          numCuenta: viaje.id.toString(),
          nombre: viaje.ruta_nombre || 'Ruta sin nombre',
          nombreSocio: viaje.conductor_nombre || 'Sin conductor asignado',
          domicilio: viaje.origen || 'Origen no especificado',
          colonia: viaje.destino || 'Destino no especificado',
          tipo: viaje.estado === 'en_progreso' ? 'En Progreso' : viaje.estado === 'programado' ? 'Programado' : 'Finalizado',
          socioId: viaje.patente || 'S/P',
          saldoTotal: viaje.capacidad || 30,
          saldoAlDia: 12, // Asientos ocupados estimados o dinámicos
          diasMora: new Date(viaje.fecha_hora_salida).getTime(),
          telefonos: `${viaje.modelo || 'Unidad'} [${viaje.patente || 'S/P'}]`,
          situacion: viaje.estado,
          latitud: viaje.latitud ? Number(viaje.latitud) : undefined,
          longitud: viaje.longitud ? Number(viaje.longitud) : undefined,
          isRealizada: viaje.estado === 'finalizado'
        };
      });

      setVisitas(mapped);
    } catch (e) {
      console.error('Error fetching viajes for mobile list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitas();
  }, [user]);

  return { visitas, loading, refresh: fetchVisitas };
}

export function useGroupedVisitas() {
  const { visitas, loading, refresh } = useVisitas();
  
  // Agrupar por destino (colonia) o estado
  const sections = visitas.reduce((acc: any[], v: Visita) => {
    const groupTitle = v.colonia; // Agrupar por destino final
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
