import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async createMessage(createMessageDto: CreateMessageDto) {
    return this.prisma.message.create({
      data: {
        content: createMessageDto.content,
        senderId: createMessageDto.senderId,
        receiverId: createMessageDto.receiverId,
      },
      include: {
        sender: true,
        receiver: true,
      },
    });
  }

  async getConversation(userId: number, otherUserId: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: otherUserId,
          },
          {
            senderId: otherUserId,
            receiverId: userId,
          },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async markAsRead(messageId: number) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });
  }

  async markConversationAsRead(userId: number, otherUserId: number) {
    return this.prisma.message.updateMany({
      where: {
        receiverId: userId,
        senderId: otherUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUserConversations(userId: number) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group messages by conversation partner
    const conversationMap = new Map();
    messages.forEach((message: { senderId: number; receiver: any; sender: any; receiverId: number; isRead: any; }) => {
      const otherUser = message.senderId === userId ? message.receiver : message.sender;
      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: message,
          unreadCount: 0,
        });
      }
      
      // Count unread messages
      if (message.receiverId === userId && !message.isRead) {
        conversationMap.get(otherUser.id).unreadCount++;
      }
    });

    return Array.from(conversationMap.values());
  }
}
