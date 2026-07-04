import { Module } from '@nestjs/common';
import { InventoryController } from './controller';
import { InventoryService } from './service';
@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
