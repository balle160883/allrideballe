import { Router, Request, Response } from 'express';
import { RouteService } from '../services/route.service';
import prisma from '../services/db.service';

const router = Router();

// ID del conductor de prueba para hoy
const DUMMY_DRIVER_ID = '76bb3ada-3b47-4c97-b80e-e6b92f729c59';

/**
 * GET /api/v1/routes/rides
 * Obtiene todos los viajes publicados
 */
router.get('/rides', async (req: Request, res: Response) => {
  try {
    const rides = await prisma.ride.findMany({
      include: { driver: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
});

/**
 * POST /api/v1/routes/calculate
 * Calcula y GUARDA el viaje en la base de datos
 */
router.post('/calculate', async (req: Request, res: Response) => {
  const { origin, destination, pricePerSeat = 50 } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origen y destino son requeridos' });
  }

  try {
    // 1. Obtener geometría de Mapbox
    const routeData = await RouteService.getRoute(origin, destination);

    // 2. Guardar en DB
    const newRide = await prisma.ride.create({
      data: {
        driverId: DUMMY_DRIVER_ID,
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: destination.lat,
        destLng: destination.lng,
        routeGeometry: JSON.stringify(routeData.geometry),
        distance: routeData.distance,
        duration: routeData.duration,
        pricePerSeat: pricePerSeat,
        status: 'PENDING'
      }
    });

    res.json({ ...routeData, rideId: newRide.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar el viaje' });
  }
});

export default router;
