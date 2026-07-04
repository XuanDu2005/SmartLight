import { Module } from '@nestjs/common';
import { AuditController } from './controller';
import { AuditService } from './service';
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
