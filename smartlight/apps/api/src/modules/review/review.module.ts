import { Module } from '@nestjs/common';
import { ReviewController } from './controller';
import { ReviewService } from './service';
@Module({
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
