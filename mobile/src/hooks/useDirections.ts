import { useState } from 'react';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg';

export function useDirections() {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRoute = async (start: number[], end: number[]) => {
    setLoading(true);
    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const json = await query.json();
      const data = json.routes[0].geometry;
      setRoute(data);
    } catch (e) {
      console.error('Error fetching directions:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => setRoute(null);

  return { route, loading, fetchRoute, clearRoute };
}
