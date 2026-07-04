import { Module } from '@nestjs/common';
import { PromotionController } from './controller';
import { PromotionService } from './service';
@Module({
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
