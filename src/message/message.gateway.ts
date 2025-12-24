import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, string> = new Map();

  constructor(private messageService: MessageService) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove user from the map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        console.log(`User ${userId} disconnected`);
        this.userSockets.delete(userId);
        
        // Broadcast that user is offline to all connected clients
        this.server.emit('user_offline', { userId });
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: number,
  ) {
    this.userSockets.set(userId, client.id);
    console.log(`User ${userId} registered with socket ${client.id}`);
    console.log(`Online users:`, Array.from(this.userSockets.entries()));
    
    // Send confirmation to registering user
    client.emit('registered', { userId, socketId: client.id });
    
    // Broadcast that user is now online to all connected clients
    this.server.emit('user_online', { 
      userId,
      onlineUsers: Array.from(this.userSockets.keys())
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateMessageDto,
  ) {
    try {
      console.log(`Message from user ${payload.senderId} to user ${payload.receiverId}`);
      
      // Save message to database
      const message = await this.messageService.createMessage(payload);
      console.log(`Message saved:`, message);

      // Get receiver's socket ID
      const receiverSocketId = this.userSockets.get(payload.receiverId);
      console.log(`Receiver socket ID: ${receiverSocketId}`);

      // Send to receiver if online
      if (receiverSocketId) {
        console.log(`Sending message to receiver`);
        this.server.to(receiverSocketId).emit('receive_message', message);
      }

      // Send confirmation to sender
      client.emit('message_sent', message);
    } catch (error) {
      console.error(`Error sending message:`, error);
      client.emit('error', { message: 'Failed to send message', error: error.message });
    }
  }

  @SubscribeMessage('get_conversation')
  async handleGetConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; otherUserId: number },
  ) {
    try {
      console.log(`Getting conversation between user ${data.userId} and ${data.otherUserId}`);
      const messages = await this.messageService.getConversation(
        data.userId,
        data.otherUserId,
      );
      
      console.log(`Found ${messages.length} messages`);

      client.emit('conversation_loaded', messages);
    } catch (error) {
      console.error(`Error loading conversation:`, error);
      client.emit('error', { message: 'Failed to load conversation', error: error.message });
    }
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: number,
  ) {
    try {
      const conversations = await this.messageService.getUserConversations(userId);
      client.emit('conversations_loaded', conversations);
    } catch (error) {
      client.emit('error', { message: 'Failed to load conversations', error: error.message });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() messageId: number,
  ) {
    try {
      const message = await this.messageService.markAsRead(messageId);
      
      // Notify sender that message was read
      const senderSocketId = this.userSockets.get(message.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('message_read', message);
      }

      client.emit('message_marked_read', message);
    } catch (error) {
      client.emit('error', { message: 'Failed to mark message as read', error: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; userId: number },
  ) {
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('user_typing', {
        userId: data.userId,
      });
    }
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; userId: number },
  ) {
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('user_stop_typing', {
        userId: data.userId,
      });
    }
  }
}
