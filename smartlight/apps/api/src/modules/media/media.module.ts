import { Module } from '@nestjs/common';
import { MediaController } from './controller';
import { MediaService } from './service';
@Module({
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
