import { Module } from '@nestjs/common';
import { ShippingController } from './controller';
import { ShippingService } from './service';
@Module({
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
