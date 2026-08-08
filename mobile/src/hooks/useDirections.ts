import { useState } from 'react';
import { AppConfig } from '../constants/config';

const MAPBOX_ACCESS_TOKEN = AppConfig.mapboxAccessToken;

export function useDirections() {
  const [route, setRoute] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [congestion, setCongestion] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchRoute = async (start: number[] | number[][], end?: number[]) => {
    setLoading(true);
    try {
      let coordsString = '';
      if (Array.isArray(start[0])) {
        // Es un array de coordenadas (number[][])
        coordsString = (start as number[][]).map(p => `${p[0]},${p[1]}`).join(';');
      } else {
        // Formato tradicional start, end
        if (end) {
          coordsString = `${(start as number[])[0]},${(start as number[])[1]};${end[0]},${end[1]}`;
        } else {
          setLoading(false);
          return;
        }
      }
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordsString}?steps=true&banner_instructions=true&voice_instructions=true&language=es&geometries=geojson&overview=full&annotations=congestion&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const json = await query.json();
      
      if (json.routes && json.routes.length > 0) {
        const routeData = json.routes[0];
        setRoute(routeData.geometry);
        setDuration(routeData.duration || 0);
        setDistance(routeData.distance || 0);
        
        if (routeData.legs && routeData.legs.length > 0) {
          const allSteps = routeData.legs.reduce((acc: any[], leg: any) => {
            return acc.concat(leg.steps || []);
          }, []);
          setSteps(allSteps);

          const allCongestion = routeData.legs.reduce((acc: string[], leg: any) => {
            return acc.concat(leg.annotation?.congestion || []);
          }, []);
          setCongestion(allCongestion);
        } else {
          setSteps([]);
          setCongestion([]);
        }
      } else {
        clearRoute();
      }
    } catch (e) {
      console.error('Error fetching directions:', e);
      clearRoute();
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setSteps([]);
    setCongestion([]);
    setDuration(0);
    setDistance(0);
  };

  return { route, steps, congestion, duration, distance, loading, fetchRoute, clearRoute };
}

