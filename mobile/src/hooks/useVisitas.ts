import { useState, useEffect } from 'react';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { OfflineService } from '../utils/OfflineService';

export interface Visita {
  id: string; // Puede ser numCuenta + tipo
  numCuenta: string;
  nombre: string;
  nombreSocio?: string; // Nombre del titular del crédito
  domicilio: string;
  tipo: 'Socio' | 'Aval 1' | 'Aval 2';
  socioId: string;
  saldoTotal: number;
  saldoAlDia: number;
  diasMora: number;
  telefonos: string;
  colonia: string;
  situacion: string;
  latitud?: number;
  longitud?: number;
  saldoCapital?: number;
  interesNormal?: number;
  moratorio?: number;
  capitalMoroso?: number;
  accesorios?: number;
  tipoCredito?: string;
  municipio?: string;
  estado?: string;
  cruces?: string;
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
      // 1. Obtener Socios (Titulares)
      const sociosData = await api.get('/portfolio/asignaciones?limit=500');

      // 2. Obtener Avales Independientes (Nueva Tabla)
      let avalesData: any[] = [];
      try {
        avalesData = await api.get('/portfolio/avales');
      } catch (err) {
        console.warn('Error fetching avales from backend:', err);
      }

      // Buscar si existen visitas cerradas offline pendientes de sincronizar
      const pendingGestiones = await OfflineService.getPendingGestiones();
      const closedCuentasOffline = pendingGestiones
        .filter(p => p.data.updateAsignacion?.situacion === 'VISITADO')
        .map(p => p.data.updateAsignacion?.numCuenta);

      const flattenedVisitas: Visita[] = [];
      
      // Procesar Socios (Titulares)
      sociosData?.forEach((item: any) => {
        const diasMora = Number(item['DIAS MORA']) || 0;
        const situacion = item['SITUACIÓN DEL CRÉDITO'];
        
        // Excluir si los días de mora son 0 o menores (no requiere visita)
        if (diasMora <= 0) return;

        const isRealizada = situacion === 'VISITADO' || closedCuentasOffline.includes(item.NoCUENTA);

        flattenedVisitas.push({
          id: `${item.NoCUENTA}-socio`,
          numCuenta: item.NoCUENTA,
          nombre: item.NOMBRE,
          nombreSocio: item.NOMBRE,
          domicilio: item.DOMICILIO,
          tipo: 'Socio',
          socioId: item.NoSOCIO,
          saldoTotal: item['SALDO TOTAL'],
          saldoAlDia: item['SALDO AL DIA'],
          diasMora: diasMora,
          telefonos: item.TELEFONOS,
          colonia: item.COLONIA || 'Sin Colonia',
          situacion: situacion,
          latitud: item.LATITUD ? Number(item.LATITUD) : undefined,
          longitud: item.LONGITUD ? Number(item.LONGITUD) : undefined,
          saldoCapital: item['PRINCIPAL'],
          interesNormal: item['INTERÉS'],
          moratorio: item['INTERÉS MORATORIO'],
          capitalMoroso: item['CAPITAL MOROSO'],
          accesorios: (Number(item['CARGO SEGURO']) || 0) + (Number(item['CARGO COBRANZA']) || 0),
          tipoCredito: item['Producto'],
          municipio: item.MUNICIPIO,
          estado: item.ESTADO,
          cruces: item.CRUCES,
          isRealizada: isRealizada,
        });
      });

      // Procesar Avales Independientes (Cruce manual para evitar dependencia de FK)
      avalesData?.forEach((item: any) => {
        // Buscamos si existe información financiera para este aval en los socios ya cargados
        const creditMatch = sociosData?.find((s: any) => s.NoCUENTA === item.num_cuenta);
        
        const diasMora = Number(creditMatch?.['DIAS MORA']) || 0;
        const situacion = creditMatch?.['SITUACIÓN DEL CRÉDITO'] || 'VIGENTE';
        
        // Excluir avales si no hay información financiera activa
        if (!creditMatch || diasMora <= 0) return;

        const isRealizada = situacion === 'VISITADO' || closedCuentasOffline.includes(item.num_cuenta);

        const effectiveSocioId = creditMatch?.NoSOCIO || item.num_cuenta?.split('-')[0] || '';

        flattenedVisitas.push({
            id: `${item.id}-aval-ext`,
            numCuenta: item.num_cuenta,
            nombre: item.nombre_aval,
            nombreSocio: creditMatch?.NOMBRE || 'Aval del Excel',
            domicilio: item.domicilio_aval,
            tipo: (item.tipo_aval || 'Aval 1') as any,
            socioId: effectiveSocioId,
            saldoTotal: creditMatch?.['SALDO TOTAL'] || 0,
            saldoAlDia: creditMatch?.['SALDO AL DIA'] || 0,
            diasMora: diasMora,
            telefonos: creditMatch?.TELEFONOS || '',
            colonia: item.colonia_aval || creditMatch?.COLONIA || 'Sin Colonia',
            situacion: situacion,
            latitud: item.latitud ? Number(item.latitud) : undefined,
            longitud: item.longitud ? Number(item.longitud) : undefined,
            saldoCapital: creditMatch?.['PRINCIPAL'],
            interesNormal: creditMatch?.['INTERÉS'],
            moratorio: creditMatch?.['INTERÉS MORATORIO'],
            capitalMoroso: creditMatch?.['CAPITAL MOROSO'],
            accesorios: (Number(creditMatch?.['CARGO SEGURO']) || 0) + (Number(creditMatch?.['CARGO COBRANZA']) || 0),
            tipoCredito: creditMatch?.['Producto'],
            municipio: item.municipio_aval || creditMatch?.MUNICIPIO,
            estado: item.estado_aval || creditMatch?.ESTADO,
            cruces: item.cruces_aval || creditMatch?.CRUCES,
            isRealizada: isRealizada,
        });
      });

      setVisitas(flattenedVisitas);
    } catch (e) {
      console.error('Error fetching visitas:', e);
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
  
  const sections = visitas.reduce((acc: any[], visita: Visita) => {
    const colonia = visita.colonia;
    const section = acc.find(s => s.title === colonia);
    if (section) {
      section.data.push(visita);
    } else {
      acc.push({ title: colonia, data: [visita] });
    }
    return acc;
  }, []);

  return { sections, loading, refresh };
}
