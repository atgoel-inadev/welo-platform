import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@app/common';

/**
 * NotificationGateway — real-time WebSocket delivery to connected clients.
 *
 * PRODUCTION SETUP:
 *   Install: npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
 *   Then replace this stub with:
 *
 *   import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
 *   import { Server, Socket } from 'socket.io';
 *
 *   @WebSocketGateway({ namespace: '/notifications', cors: true })
 *   export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
 *     @WebSocketServer() server: Server;
 *
 *     handleConnection(client: Socket) {
 *       const userId = client.handshake.auth?.userId;
 *       if (userId) client.join(`user:${userId}`);
 *     }
 *
 *     handleDisconnect(client: Socket) {}
 *
 *     emitToUser(userId: string, notification: Notification): void {
 *       this.server.to(`user:${userId}`).emit('notification', notification);
 *     }
 *   }
 *
 * Until @nestjs/websockets is installed, this stub provides the same interface
 * so NotificationService can call emitToUser() without a runtime error.
 */
@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);

  emitToUser(userId: string, notification: Notification): void {
    // No-op stub: logs instead of emitting via WebSocket.
    // Replace with the real implementation above once socket.io is installed.
    this.logger.debug(`[ws/stub] emit to user:${userId} | type=${notification.type} | id=${notification.id}`);
  }
}
