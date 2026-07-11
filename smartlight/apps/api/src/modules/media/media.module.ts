/**
 * MediaModule \u2014 owns the media bounded context.
 *
 * Responsibilities:
 *   - Upload buffers / remote URLs to a provider (Cloudinary V1)
 *   - Persist MediaFile rows + ownership metadata
 *   - Mint signed URLs for private assets
 *   - Soft-delete + provider delete
 *
 * The provider is abstracted behind the IStorageAdapter interface so a future
 * S3 / R2 / GCS adapter can be swapped without touching the service layer.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../platform/database/database.module';
import { AuthModule } from '../auth/auth.module';

import { MediaController } from './controller';
import { MediaService } from './service';
import { MediaRepository } from './repositories/media.repository';
import { CloudinaryStorageAdapter } from './adapters/cloudinary-storage.adapter';
import { STORAGE_ADAPTER } from './interfaces/storage-adapter.interface';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaRepository,
    CloudinaryStorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useExisting: CloudinaryStorageAdapter,
    },
  ],
  exports: [MediaService, STORAGE_ADAPTER],
})
export class MediaModule {}
