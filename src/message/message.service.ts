import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Message, FileType } from '@prisma';

@Injectable()
export class MessageService {
    constructor(private prisma: PrismaService) { }

    async sendMessage(senderId: number, receiverId: number, content: string): Promise<Message> {
        
        return this.prisma.client.message.create({
            data: {
                content,
                senderId,
                receiverId,
                isRead: false,
            },
            include: {
                sender: true,
                receiver: true,
            },
        });
    }

    // দুই user এর মধ্যে সব messages নাও
    async getChatBetween(user1Id: number, user2Id: number) {
        return this.prisma.client.message.findMany({
            where: {
                OR: [
                    { senderId: user1Id, receiverId: user2Id },
                    { senderId: user2Id, receiverId: user1Id },
                ],
            },
            include: {
                sender: true,
                receiver: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    // Messages কে read mark করো
    async markMessagesAsRead(messageIds: number[]) {
        return this.prisma.client.message.updateMany({
            where: {
                id: { in: messageIds },
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    // Unread messages count নাও
    async getUnreadCount(userId: number, senderId: number) {
        return this.prisma.client.message.count({
            where: {
                receiverId: userId,
                senderId: senderId,
                isRead: false,
            },
        });
    }

    // File message পাঠাও
    async sendFileMessage(fileData: {
        senderId: number;
        receiverId: number;
        filename: string;
        url: string;
        mimeType: string;
        size: number;
        publicId: string;
    }): Promise<Message> {
        // প্রথমে FileInstance create করো
        const fileInstance = await this.prisma.client.fileInstance.create({
            data: {
                originalFilename: fileData.filename,
                filename: fileData.publicId,
                url: fileData.url,
                mimeType: fileData.mimeType,
                size: fileData.size,
                fileType: this.getFileType(fileData.mimeType),
            },
        });

        // তারপর message create করো file reference সহ
        return this.prisma.client.message.create({
            data: {
                content: `📎 ${fileData.filename}`,
                senderId: fileData.senderId,
                receiverId: fileData.receiverId,
                isRead: false,
                fileInstanceId: fileInstance.id,
            },
            include: {
                sender: true,
                receiver: true,
                fileInstance: true,
            },
        });
    }

    // Message with file data নাও
    async getMessageWithFile(messageId: number) {
        return this.prisma.client.message.findUnique({
            where: { id: messageId },
            include: {
                sender: true,
                receiver: true,
                fileInstance: true,
            },
        });
    }

    // File message delete করো
    async deleteFileMessage(messageId: number) {
        return this.prisma.client.message.delete({
            where: { id: messageId },
        });
    }

    // MIME type থেকে FileType determine করো
    private getFileType(mimeType: string): FileType {
        if (mimeType.startsWith('image/')) return FileType.image;
        if (mimeType.startsWith('video/')) return FileType.video;
        if (mimeType.startsWith('audio/')) return FileType.audio;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return FileType.document;
        return FileType.any;
    }
}