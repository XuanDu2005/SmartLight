import { Module } from '@nestjs/common';
import { OrderController } from './controller';
import { OrderService } from './service';
@Module({
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
