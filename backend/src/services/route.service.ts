import { directionsService } from '../config/mapbox';

export interface Location {
  lng: number;
  lat: number;
}

export class RouteService {
  /**
   * Obtiene la ruta optimizada entre dos puntos
   */
  static async getRoute(origin: Location, destination: Location) {
    try {
      const response = await directionsService
        .getDirections({
          profile: 'driving-traffic',
          waypoints: [
            { coordinates: [origin.lng, origin.lat] },
            { coordinates: [destination.lng, destination.lat] },
          ],
          geometries: 'geojson',
          overview: 'full',
          steps: true,
        })
        .send();

      const route = response.body.routes[0];
      
      return {
        geometry: route.geometry,
        distance: route.distance, // metros
        duration: route.duration, // segundos
        steps: route.legs[0].steps,
      };
    } catch (error) {
      console.error('❌ Error al obtener ruta de Mapbox:', error);
      throw new Error('No se pudo calcular la ruta');
    }
  }

  /**
   * Calcula matriz de distancias para múltiples puntos (ideal para Delivery)
   */
  static async getMatrix(sources: Location[], destinations: Location[]) {
    // Implementación futura con matrixService
  }
}
