/**
 * MediaRepository \u2014 single source of DB access for the media bounded context.
 */
import { Injectable } from '@nestjs/common';
import { Prisma, MediaFile } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';

import { MEDIA_CONSTANTS } from '../constants/media.constants';

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MediaFileCreateInput): Promise<MediaFile> {
    return this.prisma.mediaFile.create({ data });
  }

  async findById(id: string): Promise<MediaFile | null> {
    return this.prisma.mediaFile.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByProviderAssetId(
    providerAssetId: string,
  ): Promise<MediaFile | null> {
    return this.prisma.mediaFile.findFirst({
      where: { providerAssetId, deletedAt: null },
    });
  }

  async list(filter: {
    ownerType?: string;
    ownerId?: string;
    purpose?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.MediaFileWhereInput = { deletedAt: null };
    if (filter.ownerType) where.ownerType = filter.ownerType;
    if (filter.ownerId) where.ownerId = filter.ownerId;
    if (filter.purpose) where.purpose = filter.purpose as any;

    const skip = (filter.page - 1) * filter.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaFile.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: filter.limit,
      }),
      this.prisma.mediaFile.count({ where }),
    ]);
    return { items, total };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.mediaFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async attachOwner(args: {
    id: string;
    ownerType: string;
    ownerId: string | null;
  }): Promise<MediaFile> {
    return this.prisma.mediaFile.update({
      where: { id: args.id },
      data: {
        ownerType: args.ownerType,
        ownerId: args.ownerId,
      },
    });
  }

  async recordCreatedBy(id: string, userId: string): Promise<void> {
    await this.prisma.mediaFile.update({
      where: { id },
      data: { createdById: userId },
    });
  }

  parsePagination(
    pageStr?: number | string,
    limitStr?: number | string,
  ): { page: number; limit: number } {
    const page = Math.max(
      MEDIA_CONSTANTS.DEFAULT_PAGE,
      Number(pageStr ?? MEDIA_CONSTANTS.DEFAULT_PAGE) || MEDIA_CONSTANTS.DEFAULT_PAGE,
    );
    const limit = Math.min(
      MEDIA_CONSTANTS.MAX_LIMIT,
      Math.max(
        1,
        Number(limitStr ?? MEDIA_CONSTANTS.DEFAULT_LIMIT) || MEDIA_CONSTANTS.DEFAULT_LIMIT,
      ),
    );
    return { page, limit };
  }
}