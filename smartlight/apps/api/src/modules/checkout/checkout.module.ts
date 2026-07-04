import { Module } from '@nestjs/common';
import { CheckoutController } from './controller';
import { CheckoutService } from './service';
@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
