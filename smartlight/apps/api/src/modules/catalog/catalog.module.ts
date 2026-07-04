import { Module } from '@nestjs/common';
import { CatalogController } from './controller';
import { CatalogService } from './service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
