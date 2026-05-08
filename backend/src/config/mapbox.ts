import mbxClient from '@mapbox/mapbox-sdk';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';
import mbxMatrix from '@mapbox/mapbox-sdk/services/matrix';
import dotenv from 'dotenv';
import path from 'path';

// Intentar cargar .env solo si existe (para desarrollo local), pero no fallar en Docker
dotenv.config();

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('⚠️ Mapbox Secret Token no encontrado en las variables de entorno');
}

// Solo inicializar si hay token para evitar que la app explote al arrancar
export const directionsService = MAPBOX_TOKEN ? mbxDirections(mbxClient({ accessToken: MAPBOX_TOKEN })) : null;
export const geocodingService = MAPBOX_TOKEN ? mbxGeocoding(mbxClient({ accessToken: MAPBOX_TOKEN })) : null;
export const matrixService = MAPBOX_TOKEN ? mbxMatrix(mbxClient({ accessToken: MAPBOX_TOKEN })) : null;


const client = MAPBOX_TOKEN ? mbxClient({ accessToken: MAPBOX_TOKEN }) : null;
export default client;
