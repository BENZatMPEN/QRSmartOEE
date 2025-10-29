import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class QrUpdatesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QrUpdatesGateway.name);

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendQrUpdate(site: string, oeeId: number, data: any) {
    const room = `site_${site}`;
    const eventName = `qr_update_${oeeId}`;

    this.server.to(room).emit(eventName, data);
    this.logger.log(
      `Sent QR update to room [${room}] with event [${eventName}]: ${JSON.stringify(data)}`,
    );
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, room: string): void {
    client.join(room);
    // this.logger.log(
    //   `✅ Client ${client.id} has successfully joined room: ${room}`,
    // );

    // // (ทางเลือก) ส่งข้อความยืนยันกลับไปหา Client ว่าเข้าห้องสำเร็จแล้ว
    // client.emit(
    //   'joined_room_success',
    //   `You are now subscribed to updates in ${room}`,
    // );
  }
}
