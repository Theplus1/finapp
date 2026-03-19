import {
  Inject,
  Logger,
} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

export interface FacebookVerifyNotificationPayload {
  transactionId: string;
  virtualAccountId: string;
  amountCents: number;
  currency: string;
  cardId?: string;
  cardName?: string;
  merchantName?: string;
  description?: string;
  createdAt: string;
}

interface JwtUserPayload {
  sub: string;
  username: string;
  role: string;
  type?: string;
  virtualAccountId?: string;
  bossId?: string;
}

@WebSocketGateway({
  namespace: '/ws/customer',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class AdsTransactionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AdsTransactionsGateway.name);

  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as { token?: string })?.token ??
        (client.handshake.headers.authorization || '').replace(
          /^Bearer\s+/i,
          '',
        );

      if (!token) {
        this.logger.warn('Socket connection rejected: missing JWT token');
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtUserPayload>(token);

      if (!payload.virtualAccountId) {
        this.logger.warn(
          `Socket connection rejected: no virtualAccountId for user ${payload.username}`,
        );
        client.disconnect(true);
        return;
      }

      if (payload.role !== 'ads' || payload.type !== 'customer') {
        this.logger.warn(
          `Socket connection rejected: user ${payload.username} with role=${payload.role} type=${payload.type} is not allowed`,
        );
        client.disconnect(true);
        return;
      }

      const roomName = this.getVirtualAccountRoom(payload.virtualAccountId);
      await client.join(roomName);
      this.logger.log(
        `Client ${client.id} joined room ${roomName} (user=${payload.username})`,
      );
    } catch (error) {
      this.logger.warn(
        `Socket connection rejected due to JWT verification error: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  async notifyFacebookVerify(
    payload: FacebookVerifyNotificationPayload,
  ): Promise<void> {
    const roomName = this.getVirtualAccountRoom(payload.virtualAccountId);
    this.logger.log(
      `Emitting facebook verify notification for tx=${payload.transactionId} to room=${roomName}`,
    );
    this.server.to(roomName).emit('transactions:facebookVerify:new', payload);
  }

  private getVirtualAccountRoom(virtualAccountId: string): string {
    return `va:${virtualAccountId}`;
  }
}