import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../prisma/generated';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public prismaClient: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>(
      'DATABASE_URL',
    );

    const adapter = new PrismaPg({ connectionString });

    this.prismaClient = new PrismaClient({
      adapter,
    });
  }

  async onModuleInit() {
    this.logger.log('[INIT] Prisma connecting...');
    await this.prismaClient.$connect();
    this.logger.log('[INIT] Prisma connected');
  }

  async onModuleDestroy() {
    this.logger.log('[DESTROY] Prisma disconnecting...');
    await this.prismaClient.$disconnect();
    this.logger.log('[DESTROY] Prisma disconnected');
  }

  get user() {
    return this.prismaClient.user;
  }

  get message() {
    return this.prismaClient.message;
  }
}