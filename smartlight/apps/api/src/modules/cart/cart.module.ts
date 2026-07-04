import { Module } from '@nestjs/common';
import { CartController } from './controller';
import { CartService } from './service';
@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
