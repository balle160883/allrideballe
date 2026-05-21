import { useState } from 'react';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg';

export function useDirections() {
  const [route, setRoute] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [congestion, setCongestion] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchRoute = async (start: number[], end: number[]) => {
    setLoading(true);
    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&banner_instructions=true&voice_instructions=true&language=es&geometries=geojson&annotations=congestion&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const json = await query.json();
      
      if (json.routes && json.routes.length > 0) {
        const routeData = json.routes[0];
        setRoute(routeData.geometry);
        setDuration(routeData.duration || 0);
        setDistance(routeData.distance || 0);
        
        if (routeData.legs && routeData.legs[0]) {
          const leg = routeData.legs[0];
          if (leg.steps) {
            setSteps(leg.steps);
          } else {
            setSteps([]);
          }
          
          if (leg.annotation && leg.annotation.congestion) {
            setCongestion(leg.annotation.congestion);
          } else {
            setCongestion([]);
          }
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

