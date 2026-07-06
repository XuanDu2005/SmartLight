import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { CatalogController } from './controller';
import { CatalogService } from './service';

@Module({
  imports: [DatabaseModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
