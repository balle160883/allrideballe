import { useState, useEffect, useRef } from 'react';

// Helper para calcular el rumbo (bearing) entre dos coordenadas [lng, lat]
function calculateBearing(start: [number, number], end: [number, number]): number {
  const [lon1, lat1] = start.map(x => x * Math.PI / 180);
  const [lon2, lat2] = end.map(x => x * Math.PI / 180);

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Hook para suavizar el movimiento de marcadores GPS (autobús o vehículo)
 * Realiza una interpolación lineal fluida a 60 FPS entre coordenadas objetivo.
 */
export function useSmoothLocation(
  targetCoords: [number, number] | null,
  durationMs: number = 3000
) {
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(targetCoords);
  const [heading, setHeading] = useState<number>(0);

  const startCoordsRef = useRef<[number, number] | null>(targetCoords);
  const endCoordsRef = useRef<[number, number] | null>(targetCoords);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!targetCoords) {
      setCurrentCoords(null);
      return;
    }

    // Si es la primera coordenada recibida
    if (!endCoordsRef.current) {
      startCoordsRef.current = targetCoords;
      endCoordsRef.current = targetCoords;
      setCurrentCoords(targetCoords);
      return;
    }

    // Si las coordenadas objetivo no cambiaron, no reiniciamos la animación
    if (
      endCoordsRef.current[0] === targetCoords[0] &&
      endCoordsRef.current[1] === targetCoords[1]
    ) {
      return;
    }

    // El nuevo inicio es la posición actual en la que se encuentra la animación
    startCoordsRef.current = currentCoords || endCoordsRef.current;
    endCoordsRef.current = targetCoords;
    startTimeRef.current = performance.now();

    // Calcular el rumbo hacia las nuevas coordenadas
    if (startCoordsRef.current && endCoordsRef.current) {
      const newHeading = calculateBearing(startCoordsRef.current, endCoordsRef.current);
      setHeading(newHeading);
    }

    const animate = (time: number) => {
      if (!startTimeRef.current || !startCoordsRef.current || !endCoordsRef.current) return;

      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);

      // Interpolación lineal (Ease-Out cuadrático para desaceleración suave)
      const easeOut = 1 - Math.pow(1 - progress, 2);

      const lng = startCoordsRef.current[0] + (endCoordsRef.current[0] - startCoordsRef.current[0]) * easeOut;
      const lat = startCoordsRef.current[1] + (endCoordsRef.current[1] - startCoordsRef.current[1]) * easeOut;

      setCurrentCoords([lng, lat]);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetCoords?.[0], targetCoords?.[1], durationMs]);

  return { smoothCoords: currentCoords, heading };
}
