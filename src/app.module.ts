import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MessageModule } from './message/message.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), PrismaModule, MessageModule, CloudinaryModule],
})
export class AppModule { }
