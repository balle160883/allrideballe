import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'locations',
})
export class TransporteGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TransporteGateway');

  handleConnection(client: Socket) {
    this.logger.log(`[WebSocket] Cliente conectado al flujo GPS en tiempo real: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('ping_location')
  handlePing(client: Socket, data: any) {
    client.emit('pong_location', { status: 'ok', timestamp: new Date() });
  }

  // Transmite actualización de ubicación GPS enviada desde la app móvil a todos los paneles web conectados
  broadcastLocationUpdate(locationData: any) {
    if (this.server) {
      this.server.emit('location_update', locationData);
    }
  }

  // Transmite alerta de emergencia o incidente en tiempo real a la torre de control
  broadcastAlert(alertaData: any) {
    if (this.server) {
      this.logger.log(`[WebSocket] Emitiendo alerta en tiempo real: ${alertaData.tipo} (Viaje: #${alertaData.viaje_id || 'S/V'})`);
      this.server.emit('alerta_emergencia', alertaData);
    }
  }
}
