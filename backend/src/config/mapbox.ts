import mbxClient from '@mapbox/mapbox-sdk';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';
import mbxMatrix from '@mapbox/mapbox-sdk/services/matrix';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables desde la raíz del proyecto
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('⚠️ Mapbox Secret Token no encontrado en .env');
}

const baseClient = mbxClient({ accessToken: MAPBOX_TOKEN });

export const directionsService = mbxDirections(baseClient);
export const geocodingService = mbxGeocoding(baseClient);
export const matrixService = mbxMatrix(baseClient);

export default baseClient;
