import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessageGateway } from './message.gateway';
import { MessageService } from './message.service';

@Module({
  imports: [PrismaModule],
  providers: [MessageGateway, MessageService],
})
export class MessageModule {}
