import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/detection' })
export class DetectionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server;
  private logger = new Logger('DetectionGateway');

  handleConnection(client) {
    this.logger.log('客户端连接: ' + client.id);
  }

  handleDisconnect(client) {
    this.logger.log('客户端断开: ' + client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(data, client) {
    client.join('detection:' + data.detectionId);
    return { event: 'subscribed', data: data.detectionId };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(data, client) {
    client.leave('detection:' + data.detectionId);
    return { event: 'unsubscribed', data: data.detectionId };
  }

  emitProgress(detectionId, data) {
    this.server.to('detection:' + detectionId).emit('progress', data);
  }

  emitCompleted(detectionId, data) {
    this.server.to('detection:' + detectionId).emit('completed', data);
  }
}
