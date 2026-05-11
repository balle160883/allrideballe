import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

// Cargar .env
dotenv.config();

const app = express();
const server = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'https://allride-app.2.24.81.205.sslip.io';

const io = new Server(server, {
  cors: {
    origin: [frontendUrl, "http://localhost:5173"],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: [frontendUrl, "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());

import routeRoutes from './routes/route.routes';
import authRoutes from './routes/auth.routes';

// ... (middleware anterior)

// Routes
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/auth', authRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'AllRide Clone API', mapbox_status: !!process.env.MAPBOX_PUBLIC_TOKEN });
});

// WebSocket Real-time Tracking
io.on('connection', (socket) => {
  console.log('📱 Cliente conectado:', socket.id);

  // El conductor inicia el viaje y empieza a emitir
  socket.on('startRide', (rideId) => {
    socket.join(`ride_${rideId}`);
    console.log(`🚗 Viaje iniciado: ${rideId}`);
  });

  socket.on('updateLocation', (data) => {
    const { rideId, location, bearing } = data;
    // Emitir a todos en la sala del viaje (pasajeros)
    io.to(`ride_${rideId}`).emit('driverLocationUpdate', { location, bearing });
  });

  socket.on('joinRide', (rideId) => {
    socket.join(`ride_${rideId}`);
    console.log(`👤 Pasajero siguiendo viaje: ${rideId}`);
  });

  socket.on('sendMessage', (data) => {
    const { rideId, message, senderId, senderName } = data;
    io.to(`ride_${rideId}`).emit('receiveMessage', { 
      message, 
      senderId, 
      senderName, 
      timestamp: new Date() 
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
