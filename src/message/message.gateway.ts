import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Readable } from 'stream';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers: Map<number, Set<string>> = new Map();

  // Socket ID to User ID mapping
  private socketToUser: Map<string, number> = new Map();

  constructor(
    private messageService: MessageService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ==================== CONNECTION HANDLERS ====================

  // Client connect হলে
  handleConnection(client: Socket) {
    console.log('🟢 Client connected:', client.id);
  }

  // Client disconnect হলে
  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      // User এর socket list থেকে এই socket remove করো
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);

        // যদি user এর আর কোনো active socket না থাকে, তাহলে offline
        if (userSockets.size === 0) {
          this.onlineUsers.delete(userId);
          // সবাইকে জানাও যে user offline
          this.server.emit('userOffline', { userId });
          console.log(`🔴 User ${userId} is now offline`);
        }
      }

      this.socketToUser.delete(client.id);
    }

    console.log('🔴 Client disconnected:', client.id);
  }

  // ==================== JOIN & ONLINE STATUS ====================

  // User chat এ join করলে
  @SubscribeMessage('joinChat')
  handleJoinChat(
    @MessageBody() userId: number,
    @ConnectedSocket() client: Socket,
  ) {
    // User কে তার নিজের room এ join করাও
    client.join(`user_${userId}`);

    // Socket to User mapping store করো
    this.socketToUser.set(client.id, userId);

    // Online users list এ add করো
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(client.id);

    // সবাইকে জানাও যে user online
    this.server.emit('userOnline', { userId });

    console.log(`✅ User ${userId} joined their room (Socket: ${client.id})`);

    // Currently online users list পাঠাও
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    client.emit('onlineUsers', onlineUserIds);

    return { success: true, message: `Joined as user ${userId}` };
  }

  // ==================== MESSAGING ====================

  // Message পাঠানোর event
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { senderId: number; receiverId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Database এ message save করো
      const message = await this.messageService.sendMessage(
        data.senderId,
        data.receiverId,
        data.content,
      );

      // Sender এবং Receiver দুজনকেই message পাঠাও
      this.server.to(`user_${data.senderId}`).emit('newMessage', message);
      this.server.to(`user_${data.receiverId}`).emit('newMessage', message);

      return { success: true, message };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  // ==================== FILE SHARING ====================

  // File পাঠানোর event
  @SubscribeMessage('sendFile')
  async handleSendFile(
    @MessageBody() data: { senderId: number; receiverId: number; file: { buffer: string; originalname: string; mimetype: string; size: number } },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Buffer string কে actual buffer এ convert করো
      const fileBuffer = Buffer.from(data.file.buffer, 'base64');

      // Cloudinary এ upload করো
      const multerFile: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: data.file.originalname,
        mimetype: data.file.mimetype,
        size: data.file.size,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: new Readable
      };

      const uploadResult = await this.cloudinaryService.uploadFile(
        multerFile,
        'chat-files',
      );

      // Message with file create করো
      const message = await this.messageService.sendFileMessage({
        senderId: data.senderId,
        receiverId: data.receiverId,
        filename: data.file.originalname,
        url: uploadResult.secure_url,
        mimeType: data.file.mimetype,
        size: data.file.size,
        publicId: uploadResult.public_id,
      });

      // Sender এবং Receiver দুজনকেই message পাঠাও
      this.server.to(`user_${data.senderId}`).emit('newMessage', message);
      this.server.to(`user_${data.receiverId}`).emit('newMessage', message);

      return { success: true, message };
    } catch (error) {
      console.error('❌ Error sending file:', error);
      return { success: false, error: 'Failed to send file' };
    }
  }

  // File delete করার event
  @SubscribeMessage('deleteFile')
  async handleDeleteFile(
    @MessageBody() data: { messageId: number; senderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const fileData = await this.messageService.getMessageWithFile(data.messageId);

      if (!fileData || !fileData.fileInstance) {
        return { success: false, error: 'File not found' };
      }

      // Cloudinary থেকে delete করো
      await this.cloudinaryService.deleteFile(fileData.fileInstance.id);

      // Database থেকে delete করো
      await this.messageService.deleteFileMessage(data.messageId);

      // উভয় user কে notify করো
      this.server.to(`user_${data.senderId}`).emit('fileDeleted', { messageId: data.messageId });
      this.server.to(`user_${fileData.receiverId}`).emit('fileDeleted', { messageId: data.messageId });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return { success: false, error: 'Failed to delete file' };
    }
  }

  // দুই user এর মধ্যে chat history load করো
  @SubscribeMessage('loadChatHistory')
  async handleLoadHistory(
    @MessageBody() data: { userId: number; friendId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const messages = await this.messageService.getChatBetween(
        data.userId,
        data.friendId,
      );

      client.emit('chatHistory', messages);
      return { success: true, count: messages.length };
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      return { success: false, error: 'Failed to load chat history' };
    }
  }

  // ==================== TYPING INDICATOR ====================

  // User typing শুরু করলে
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { senderId: number; receiverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Receiver কে জানাও যে sender typing করছে
    this.server.to(`user_${data.receiverId}`).emit('userTyping', {
      userId: data.senderId,
      isTyping: true,
    });
  }

  // User typing বন্ধ করলে
  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { senderId: number; receiverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Receiver কে জানাও যে sender typing বন্ধ করেছে
    this.server.to(`user_${data.receiverId}`).emit('userTyping', {
      userId: data.senderId,
      isTyping: false,
    });
  }

  // ==================== MESSAGE READ STATUS ====================

  // Message পড়া হয়েছে mark করো
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { messageIds: number[]; readerId: number; senderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Database এ messages read mark করো
      await this.messageService.markMessagesAsRead(data.messageIds);

      // Sender কে জানাও যে তার messages পড়া হয়েছে
      this.server.to(`user_${data.senderId}`).emit('messagesRead', {
        messageIds: data.messageIds,
        readerId: data.readerId,
        readAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return { success: false, error: 'Failed to mark messages as read' };
    }
  }

  // ==================== ONLINE STATUS CHECK ====================

  // Check if a specific user is online
  @SubscribeMessage('checkOnline')
  handleCheckOnline(
    @MessageBody() userId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const isOnline = this.onlineUsers.has(userId);
    client.emit('onlineStatus', { userId, isOnline });
    return { userId, isOnline };
  }
}