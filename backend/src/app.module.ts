import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { BoardingModule } from './boarding/boarding.module';
import { StoreModule } from './store/store.module';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { FavoritesModule } from './favorites/favorites.module';
import { BlockReportModule } from './block-report/block-report.module';
import { EmailModule } from './email/email.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot(
      process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID != null
        ? [
            { name: 'default', ttl: 60_000, limit: 10_000 },
            { name: 'auth', ttl: 60_000, limit: 10_000 },
          ]
        : [
            { name: 'default', ttl: 60_000, limit: 200 },
            { name: 'auth', ttl: 60_000, limit: 30 },
          ],
    ),
    AuthModule,
    UsersModule,
    PetsModule,
    BoardingModule,
    StoreModule,
    ChatModule,
    AdminModule,
    FavoritesModule,
    BlockReportModule,
    CloudinaryModule,
    EmailModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
