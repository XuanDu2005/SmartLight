import { Module } from '@nestjs/common';
import { NotificationController } from './controller';
import { NotificationService } from './service';
@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
