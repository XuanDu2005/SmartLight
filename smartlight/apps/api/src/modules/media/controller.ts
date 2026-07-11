/**
 * MediaController \u2014 admin endpoints for upload, list, attach, delete, sign.
 *
 *   POST   /admin/media/upload-url           \u2014 register a remote URL
 *   GET    /admin/media                      \u2014 list with filters
 *   GET    /admin/media/:id                  \u2014 single record
 *   PATCH  /admin/media/:id/attach           \u2014 bind to owner
 *   DELETE /admin/media/:id                  \u2014 soft-delete + provider delete
 *   GET    /admin/media/:id/signed-url       \u2014 mint signed URL
 *   POST   /admin/media/upload-buffer        \u2014 raw multipart (admin only)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { MediaService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';
import { SWAGGER_BEARER_AUTH } from '../../config/swagger';

import {
  AttachMediaDto,
  CreateMediaFromUrlDto,
  ListMediaQueryDto,
  SignedUrlQueryDto,
} from './dto/media.dto';
import type {
  MediaFileResponseDto,
  MediaListResponseDto,
  MediaUploadResponseDto,
  SignedUrlResponseDto,
} from './dto/media-response.dto';
import { MEDIA_CONSTANTS } from './constants/media.constants';

@ApiTags('Media')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('admin/media')
@Roles('admin', 'catalog_manager', 'marketing_manager')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /**
   * Register a remote URL as a media file (server-side fetch + upload).
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a remote URL as a media file' })
  async uploadFromUrl(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateMediaFromUrlDto,
  ): Promise<MediaUploadResponseDto> {
    return this.media.uploadFromUrl(dto, user.id);
  }

  /**
   * Upload a file buffer directly (admin).
   */
  @Post('upload-buffer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file buffer (multipart)' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_CONSTANTS.MAX_UPLOAD_BYTES },
    }),
  )
  async uploadBuffer(
    @CurrentUser() user: UserPrincipal,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('ownerType') ownerType?: string,
    @Body('ownerId') ownerId?: string,
    @Body('purpose') purpose?: string,
  ): Promise<MediaUploadResponseDto> {
    if (!file) {
      throw new Error('file is required (multipart field "file")');
    }
    return this.media.uploadBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname || 'upload.bin',
      ownerType,
      ownerId,
      purpose,
      createdById: user.id,
    });
  }

  /**
   * List media with optional filters.
   */
  @Get()
  @ApiOperation({ summary: 'List media with filters' })
  async list(
    @Query() query: ListMediaQueryDto,
  ): Promise<MediaListResponseDto> {
    return this.media.listMedia(query);
  }

  /**
   * Fetch a single media file by id.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single media record by id' })
  async get(@Param('id') id: string): Promise<MediaFileResponseDto> {
    return this.media.getMedia(id);
  }

  /**
   * Attach a media file to an owner (product/category/brand/...).
   */
  @Patch(':id/attach')
  @ApiOperation({ summary: 'Attach a media file to an owner' })
  async attach(
    @Param('id') id: string,
    @Body() dto: AttachMediaDto,
  ): Promise<MediaFileResponseDto> {
    const body: AttachMediaDto = { ...dto, mediaId: id };
    return this.media.attach(body);
  }

  /**
   * Mint a fresh signed URL for a private asset.
   */
  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Mint a signed URL for a private asset' })
  async signedUrl(
    @Param('id') id: string,
    @Query() query: SignedUrlQueryDto,
  ): Promise<SignedUrlResponseDto> {
    return this.media.mintSignedUrl(id, query.ttlSec);
  }

  /**
   * Soft-delete a media record and best-effort delete at the provider.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a media record' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.media.softDelete(id);
  }
}
