import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ProductFilterInput,
} from './interfaces/catalog.interfaces';
import type {
  CategoryResponseDto,
  CategoryTreeNodeDto,
  BrandResponseDto,
  ProductListItemDto,
  ProductDetailDto,
  ProductVariantResponseDto,
  BulkOperationResultDto,
} from './dto';
import {
  BrandHasProductsException,
  BrandNotFoundException,
  CategoryHasChildrenException,
  CategoryHasProductsException,
  CategoryNotFoundException,
  InvalidPriceException,
  ProductMustHaveImageException,
  ProductNotFoundException,
  SkuAlreadyExistsException,
  SlugAlreadyExistsException,
  VariantNotFoundException,
} from './exceptions/catalog.exceptions';
import {
  CreateBrandDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
  UpdateVariantPriceDto,
} from './dto';

// Local enum mirrors matching Prisma enums
const CategoryStatus = { DRAFT: 'DRAFT', ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' } as const;
const BrandStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const;
const ProductStatus = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', UNPUBLISHED: 'UNPUBLISHED', ARCHIVED: 'ARCHIVED' } as const;
const ProductVariantStatus = { ACTIVE: 'ACTIVE', OUT_OF_STOCK: 'OUT_OF_STOCK', DISCONTINUED: 'DISCONTINUED' } as const;

function d2n(v: Prisma.Decimal | null | undefined): number {
  return v == null ? 0 : Number(v);
}

function dt2s(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

@Injectable()
export class CatalogService {
  private readonly log = new Logger(CatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  //  SLUG UTILITIES
  // =============================================================================

  private async slugExists(slug: string, table: 'category' | 'brand' | 'product'): Promise<boolean> {
    const result = await (this.prisma as any)[table].findUnique({ where: { slug }, select: { id: true } });
    return !!result;
  }

  private async variantSkuExists(sku: string): Promise<boolean> {
    const result = await this.prisma.productVariant.findUnique({ where: { sku }, select: { id: true } });
    return !!result;
  }

  async generateUniqueSlug(base: string, table: 'category' | 'brand' | 'product'): Promise<string> {
    let slug = this.makeSlug(base);
    let suffix = 0;
    while (await this.slugExists(slug, table)) {
      suffix++;
      slug = `${this.makeSlug(base)}-${suffix}`;
    }
    return slug;
  }

  private makeSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120);
  }

  // =============================================================================
  //  CATEGORY CRUD
  // =============================================================================

  async listCategories(opts: {
    parentId?: string | null;
    isActive?: boolean;
    limit?: number;
    sort?: string;
  }): Promise<{ data: CategoryResponseDto[]; meta: Record<string, unknown> }> {
    const { parentId, isActive = true, limit = 100, sort = 'displayOrder' } = opts;

    const where: Prisma.CategoryWhereInput = { deletedAt: null };
    if (parentId === undefined || parentId === null) {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }
    if (isActive !== undefined) {
      where.status = (isActive ? 'ACTIVE' : 'DRAFT') as any;
    }

    const orderBy: Prisma.CategoryOrderByWithRelationInput[] =
      sort === 'name' || sort === '-name'
        ? [{ name: sort === '-name' ? 'desc' : 'asc' }]
        : [{ displayOrder: 'asc' }];

    const rows = await this.prisma.category.findMany({
      where,
      orderBy,
      take: limit,
    });

    const ids = rows.map((r) => r.id);
    const counts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { categoryId: { in: ids }, deletedAt: null },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count.id]));

    const data: CategoryResponseDto[] = rows.map((r) => ({
      id: r.id,
      parentId: r.parentId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      displayOrder: r.displayOrder,
      level: r.level,
      isActive: r.status === 'ACTIVE',
      productCount: countMap.get(r.id) ?? 0,
      imageUrl: null,
      isFeatured: r.isFeatured,
      metaTitle: r.metaTitle,
      metaDesc: r.metaDesc,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    }));

    return { data, meta: {} };
  }

  async listCategoriesAdmin(opts: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{
    data: CategoryResponseDto[];
    meta: { pagination: { page: number; limit: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrev: boolean; nextPage: number | null; prevPage: number | null } };
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, Math.min(200, opts.limit ?? 20));
    const where: Prisma.CategoryWhereInput = { deletedAt: null };
    if (opts.isActive !== undefined) where.status = (opts.isActive ? 'ACTIVE' : 'DRAFT') as any;
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { slug: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    const [rows, totalItems] = await Promise.all([
      this.prisma.category.findMany({ where, orderBy: { displayOrder: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.category.count({ where }),
    ]);
    const ids = rows.map((r) => r.id);
    const counts = await this.prisma.product.groupBy({ by: ['categoryId'], where: { categoryId: { in: ids }, deletedAt: null }, _count: { id: true } });
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count.id]));
    const data: CategoryResponseDto[] = rows.map((r) => ({
      id: r.id,
      parentId: r.parentId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      displayOrder: r.displayOrder,
      level: r.level,
      isActive: r.status === 'ACTIVE',
      productCount: countMap.get(r.id) ?? 0,
      imageUrl: null,
      isFeatured: r.isFeatured,
      metaTitle: r.metaTitle,
      metaDesc: r.metaDesc,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    }));
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      data,
      meta: {
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      },
    };
  }

  async getCategoryTree(): Promise<{ data: CategoryTreeNodeDto[] }> {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null, status: CategoryStatus.ACTIVE as any },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageMediaId: true,
        isFeatured: true,
        level: true,
      },
    });

    const map = new Map<string, CategoryTreeNodeDto>();
    const roots: CategoryTreeNodeDto[] = [];

    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        imageUrl: null,
        isFeatured: r.isFeatured,
        children: [],
      });
    }
    for (const r of rows) {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId)) {
        map.get(r.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { data: roots };
  }

  async getCategoryById(id: string): Promise<CategoryResponseDto> {
    const r = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!r) throw new CategoryNotFoundException(id);

    const count = await this.prisma.product.count({ where: { categoryId: id, deletedAt: null } });

    return {
      id: r.id,
      parentId: r.parentId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      displayOrder: r.displayOrder,
      level: r.level,
      isActive: r.status === 'ACTIVE',
      productCount: count,
      imageUrl: null,
      isFeatured: r.isFeatured,
      metaTitle: r.metaTitle,
      metaDesc: r.metaDesc,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    };
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    if (await this.slugExists(dto.slug, 'category')) {
      throw new SlugAlreadyExistsException(dto.slug, 'category');
    }

    let level = 0;
    let path = '/';

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) throw new CategoryNotFoundException(dto.parentId);
      level = parent.level + 1;
      path = `${parent.path}${parent.id}/`;
    }

    const r = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        imageMediaId: dto.imageMediaId ?? null,
        displayOrder: dto.displayOrder ?? 0,
        level,
        path,
        status: (dto.isActive !== false ? 'ACTIVE' : 'DRAFT') as any,
        isFeatured: dto.isFeatured ?? false,
        taxExempt: dto.taxExempt ?? false,
        metaTitle: dto.metaTitle ?? null,
        metaDesc: dto.metaDesc ?? null,
      },
    });

    return {
      id: r.id,
      parentId: r.parentId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      displayOrder: r.displayOrder,
      level: r.level,
      isActive: r.status === 'ACTIVE',
      productCount: 0,
      imageUrl: null,
      isFeatured: r.isFeatured,
      metaTitle: r.metaTitle,
      metaDesc: r.metaDesc,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new CategoryNotFoundException(id);

    if (dto.slug && dto.slug !== existing.slug) {
      if (await this.slugExists(dto.slug, 'category')) {
        throw new SlugAlreadyExistsException(dto.slug, 'category');
      }
    }

    const updateData: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) updateData.status = (dto.isActive ? 'ACTIVE' : 'DRAFT') as any;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
    if (dto.taxExempt !== undefined) updateData.taxExempt = dto.taxExempt;
    if (dto.imageMediaId !== undefined) updateData.imageMediaId = dto.imageMediaId;
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle;
    if (dto.metaDesc !== undefined) updateData.metaDesc = dto.metaDesc;

    const r = await this.prisma.category.update({ where: { id }, data: updateData });
    const count = await this.prisma.product.count({ where: { categoryId: id, deletedAt: null } });

    return {
      id: r.id,
      parentId: r.parentId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      displayOrder: r.displayOrder,
      level: r.level,
      isActive: r.status === 'ACTIVE',
      productCount: count,
      imageUrl: null,
      isFeatured: r.isFeatured,
      metaTitle: r.metaTitle,
      metaDesc: r.metaDesc,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    };
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new CategoryNotFoundException(id);

    const childCount = await this.prisma.category.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) throw new CategoryHasChildrenException();

    const productCount = await this.prisma.product.count({ where: { categoryId: id, deletedAt: null } });
    if (productCount > 0) throw new CategoryHasProductsException();

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), status: CategoryStatus.ARCHIVED as any },
    });
  }

  async restoreCategory(id: string): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (existing) return this.getCategoryById(id);

    const r = await this.prisma.category.findUnique({ where: { id } });
    if (!r) throw new CategoryNotFoundException(id);

    const restored = await this.prisma.category.update({
      where: { id },
      data: { deletedAt: null, status: CategoryStatus.ACTIVE as any },
    });

    return {
      id: restored.id,
      parentId: restored.parentId,
      name: restored.name,
      slug: restored.slug,
      description: restored.description,
      displayOrder: restored.displayOrder,
      level: restored.level,
      isActive: restored.status === 'ACTIVE',
      productCount: 0,
      imageUrl: null,
      isFeatured: restored.isFeatured,
      metaTitle: restored.metaTitle,
      metaDesc: restored.metaDesc,
      createdAt: dt2s(restored.createdAt)!,
      updatedAt: dt2s(restored.updatedAt)!,
    };
  }

  // =============================================================================
  //  BRAND CRUD
  // =============================================================================

  async listBrands(opts: {
    isActive?: boolean;
    limit?: number;
    sort?: string;
  }): Promise<{ data: BrandResponseDto[] }> {
    const { isActive, limit = 100, sort } = opts;

    const where: Prisma.BrandWhereInput = { deletedAt: null };
    if (isActive !== undefined) {
      where.status = (isActive ? 'ACTIVE' : 'INACTIVE') as any;
    }

    const orderBy: Prisma.BrandOrderByWithRelationInput[] = [{ name: 'asc' }];
    if (sort === '-name') orderBy.unshift({ name: 'desc' });

    const rows = await this.prisma.brand.findMany({
      where,
      orderBy,
      take: limit,
    });

    const ids = rows.map((r) => r.id);
    const counts = await this.prisma.product.groupBy({
      by: ['brandId'],
      where: { brandId: { in: ids }, deletedAt: null },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.brandId as string, c._count.id]));

    const data: BrandResponseDto[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      logo: null,
      isActive: r.status === 'ACTIVE',
      productCount: countMap.get(r.id) ?? 0,
      isFeatured: r.isFeatured,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    }));

    return { data };
  }

  /**
   * Admin: paginated, searchable brand list. Returns the standard
   * `{ data, meta.pagination }` envelope consumed by the admin UI's
   * `unwrapPaginated` helper.
   */
  async listBrandsAdmin(opts: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{
    data: BrandResponseDto[];
    meta: {
      pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextPage: number | null;
        prevPage: number | null;
      };
    };
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, Math.min(100, opts.limit ?? 20));

    const where: Prisma.BrandWhereInput = { deletedAt: null };
    if (opts.isActive !== undefined) {
      where.status = (opts.isActive ? 'ACTIVE' : 'INACTIVE') as any;
    }
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { slug: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.brand.count({ where }),
    ]);

    const ids = rows.map((r) => r.id);
    const counts = await this.prisma.product.groupBy({
      by: ['brandId'],
      where: { brandId: { in: ids }, deletedAt: null },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.brandId as string, c._count.id]));

    const data: BrandResponseDto[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      logo: null,
      isActive: r.status === 'ACTIVE',
      productCount: countMap.get(r.id) ?? 0,
      isFeatured: r.isFeatured,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    }));

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      data,
      meta: {
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      },
    };
  }

  async getBrandById(id: string): Promise<BrandResponseDto> {
    const r = await this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!r) throw new BrandNotFoundException(id);

    const count = await this.prisma.product.count({ where: { brandId: id, deletedAt: null } });

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      logo: null,
      isActive: r.status === 'ACTIVE',
      productCount: count,
      isFeatured: r.isFeatured,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    };
  }

  async createBrand(dto: CreateBrandDto): Promise<BrandResponseDto> {
    const slug = dto.slug ?? (await this.generateUniqueSlug(dto.name, 'brand'));
    if (await this.slugExists(slug, 'brand')) {
      throw new SlugAlreadyExistsException(slug, 'brand');
    }

    const r = await this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        logoMediaId: dto.logoMediaId ?? null,
        isFeatured: dto.isFeatured ?? false,
        status: (dto.isActive !== false ? 'ACTIVE' : 'INACTIVE') as any,
      },
    });

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      logo: null,
      isActive: r.status === 'ACTIVE',
      productCount: 0,
      isFeatured: r.isFeatured,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    };
  }

  async updateBrand(id: string, dto: UpdateBrandDto): Promise<BrandResponseDto> {
    const existing = await this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new BrandNotFoundException(id);

    if (dto.slug && dto.slug !== existing.slug) {
      if (await this.slugExists(dto.slug, 'brand')) {
        throw new SlugAlreadyExistsException(dto.slug, 'brand');
      }
    }

    const updateData: Prisma.BrandUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.logoMediaId !== undefined) updateData.logoMediaId = dto.logoMediaId;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
    if (dto.isActive !== undefined) updateData.status = (dto.isActive ? 'ACTIVE' : 'INACTIVE') as any;

    const r = await this.prisma.brand.update({ where: { id }, data: updateData });
    const count = await this.prisma.product.count({ where: { brandId: id, deletedAt: null } });

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      logo: null,
      isActive: r.status === 'ACTIVE',
      productCount: count,
      isFeatured: r.isFeatured,
      createdAt: dt2s(r.createdAt)!,
      updatedAt: dt2s(r.updatedAt)!,
    };
  }

  async deleteBrand(id: string): Promise<void> {
    const existing = await this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new BrandNotFoundException(id);

    const productCount = await this.prisma.product.count({ where: { brandId: id, deletedAt: null } });
    if (productCount > 0) throw new BrandHasProductsException();

    await this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date(), status: BrandStatus.INACTIVE as any },
    });
  }

  // =============================================================================
  //  PRODUCT CRUD
  // =============================================================================

  async listProducts(
    filter: ProductFilterInput,
  ): Promise<{ data: ProductListItemDto[]; meta: Record<string, unknown> }> {
    const {
      q,
      categoryId,
      categorySlug,
      brandId,
      brandSlug,
      minPrice,
      maxPrice,
      featured,
      newArrival,
      sort = 'createdDesc',
      page = 1,
      limit = 20,
    } = filter;

    let resolvedCategoryId: string | undefined = categoryId;
    if (categorySlug && !categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      resolvedCategoryId = cat?.id;
    }

    let resolvedBrandId: string | undefined = brandId;
    if (brandSlug && !brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { slug: brandSlug },
        select: { id: true },
      });
      resolvedBrandId = brand?.id;
    }

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      status: ProductStatus.PUBLISHED as any,
    };
    if (resolvedCategoryId) where.categoryId = resolvedCategoryId;
    if (resolvedBrandId) where.brandId = resolvedBrandId;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) (where.basePrice as any).gte = minPrice;
      if (maxPrice !== undefined) (where.basePrice as any).lte = maxPrice;
    }
    if (featured) where.isFeatured = true;
    if (newArrival) where.isNewArrival = true;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { shortDesc: { contains: q, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const orderBy = this.parseSort(sort);

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          images: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            take: 1,
          },
          variants: {
            where: { deletedAt: null },
            select: {
              id: true,
              price: true,
              status: true,
              isDefault: true,
              inventory: { select: { available: true, lowStockThreshold: true } },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const data: ProductListItemDto[] = rows.map((p) => {
      const primary = p.images[0] ?? null;
      const prices = p.variants.map((v) => d2n(v.price));
      const minPriceVal = prices.length > 0 ? Math.min(...prices) : d2n(p.basePrice);
      const maxPriceVal = prices.length > 0 ? Math.max(...prices) : d2n(p.basePrice);
      const hasStock = p.variants.some(
        (v) => v.status === 'ACTIVE' && (v.inventory?.available ?? 0) > 0,
      );

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDesc,
        brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
        category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
        primaryImage: primary ? { url: '', altText: primary.altText } : null,
        basePrice: d2n(p.basePrice),
        compareAtPrice: d2n(p.compareAtPrice),
        currency: 'VND',
        hasVariants: p.variants.length > 0,
        priceRange:
          prices.length > 1
            ? { min: minPriceVal, max: maxPriceVal, currency: 'VND' }
            : null,
        inStock: hasStock,
        averageRating: d2n(p.ratingAvg),
        reviewCount: p.ratingCount,
        createdAt: dt2s(p.createdAt)!,
        publishedAt: dt2s(p.publishedAt),
        tags: p.tags,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
        filters: { appliedFilters: {} },
        sort: [{ field: sort, order: sort.startsWith('-') ? 'desc' : 'asc' }],
      },
    };
  }

  async listFeaturedProducts(limit = 12): Promise<ProductListItemDto[]> {
    const rows = await this.prisma.product.findMany({
      where: { deletedAt: null, status: ProductStatus.PUBLISHED as any, isFeatured: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          take: 1,
        },
        variants: {
          where: { deletedAt: null },
          select: {
            id: true,
            price: true,
            status: true,
            inventory: { select: { available: true } },
          },
        },
      },
    });
    return rows.map((p) => this.mapProductToListItem(p));
  }

  async listBestSellers(limit = 12): Promise<ProductListItemDto[]> {
    const rows = await this.prisma.product.findMany({
      where: { deletedAt: null, status: ProductStatus.PUBLISHED as any, ratingCount: { gt: 0 } },
      orderBy: [{ ratingCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          take: 1,
        },
        variants: {
          where: { deletedAt: null },
          select: {
            id: true,
            price: true,
            status: true,
            inventory: { select: { available: true } },
          },
        },
      },
    });
    return rows.map((p) => this.mapProductToListItem(p));
  }

  async listNewArrivals(limit = 12): Promise<ProductListItemDto[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.PUBLISHED as any,
        isNewArrival: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          take: 1,
        },
        variants: {
          where: { deletedAt: null },
          select: {
            id: true,
            price: true,
            status: true,
            inventory: { select: { available: true } },
          },
        },
      },
    });
    return rows.map((p) => this.mapProductToListItem(p));
  }

  async getProductById(id: string, _include: string[] = []): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          include: { media: true },
        },
        variants: {
          where: { deletedAt: null },
          orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
          include: {
            images: { where: { deletedAt: null }, take: 1 },
            inventory: true,
          },
        },
        attributes: {
          include: { attribute: true },
        },
      },
    });

    if (!product) throw new ProductNotFoundException(id);

    const hasStock = product.variants.some(
      (v) => v.status === 'ACTIVE' && (v.inventory?.available ?? 0) > 0,
    );
    const prices = product.variants.map((v) => d2n(v.price));
    const minPrice = prices.length > 0 ? Math.min(...prices) : d2n(product.basePrice);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : d2n(product.basePrice);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDesc,
      brand: product.brand
        ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug }
        : null,
      category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
      basePrice: d2n(product.basePrice),
      compareAtPrice: d2n(product.compareAtPrice),
      currency: 'VND',
      hasVariants: product.variants.length > 0,
      priceRange:
        prices.length > 1 ? { min: minPrice, max: maxPrice, currency: 'VND' } : null,
      inStock: hasStock,
      averageRating: d2n(product.ratingAvg),
      reviewCount: product.ratingCount,
      createdAt: dt2s(product.createdAt)!,
      publishedAt: dt2s(product.publishedAt),
      tags: product.tags,
      description: product.description,
      primaryImage: (() => {
        const img = product.images.find((i) => i.isPrimary) || product.images[0];
        return img ? { url: (img.media as any)?.secureUrl ?? '', altText: img.altText } : null;
      })(),
      images: product.images.map((img) => ({
        id: img.id,
        url: (img.media as any)?.secureUrl ?? '',
        altText: img.altText,
        displayOrder: img.displayOrder,
        isPrimary: img.isPrimary,
        variants: null,
      })),
      variants: product.variants.map((v) => this.mapVariantToResponse(v)),
      attributes: product.attributes.map((av) => ({
        attributeId: av.attributeId,
        name: av.attribute.code,
        displayName: av.attribute.displayName,
        value: av.valueText ?? (av.valueNumber !== null ? d2n(av.valueNumber) : av.valueBoolean),
        unit: av.attribute.unit,
      })),
      metaTitle: product.metaTitle,
      metaDesc: product.metaDesc,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      updatedAt: dt2s(product.updatedAt)!,
    };
  }

  async getProductBySlug(slug: string, include?: string[]): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!product) throw new ProductNotFoundException(slug);
    return this.getProductById(product.id, include);
  }

  async createProduct(dto: CreateProductDto): Promise<ProductDetailDto> {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, deletedAt: null },
    });
    if (!category) throw new CategoryNotFoundException(dto.categoryId);

    if (dto.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: dto.brandId, deletedAt: null },
      });
      if (!brand) throw new BrandNotFoundException(dto.brandId);
    }

    const slug = dto.slug ?? (await this.generateUniqueSlug(dto.name, 'product'));
    if (await this.slugExists(slug, 'product')) {
      throw new SlugAlreadyExistsException(slug, 'product');
    }

    if (dto.basePrice !== undefined && dto.basePrice < 0) {
      throw new InvalidPriceException();
    }

    const statusMap: Record<string, string> = {
      draft: 'DRAFT', published: 'PUBLISHED', unpublished: 'UNPUBLISHED', archived: 'ARCHIVED',
    };
    const status = dto.status ? statusMap[dto.status.toLowerCase()] ?? 'DRAFT' : 'DRAFT';

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: dto.name,
          slug,
          categoryId: dto.categoryId,
          brandId: dto.brandId ?? null,
          basePrice: dto.basePrice ?? 0,
          compareAtPrice: dto.compareAtPrice ?? null,
          shortDesc: dto.shortDescription ?? null,
          description: dto.description ?? null,
          status: status as any,
          isFeatured: dto.isFeatured ?? false,
          isNewArrival: dto.isNewArrival ?? false,
          tags: dto.tags ?? [],
          metaTitle: dto.metaTitle ?? null,
          metaDesc: dto.metaDesc ?? null,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
        },
      });

      if (dto.variants && dto.variants.length > 0) {
        for (const v of dto.variants) {
          if (await this.variantSkuExists(v.sku)) {
            throw new SkuAlreadyExistsException(v.sku);
          }
          await tx.productVariant.create({
            data: {
              productId: created.id,
              sku: v.sku,
              barcode: v.barcode ?? null,
              name: v.name,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? null,
              cost: v.cost ?? null,
              weightGrams: v.weightGrams ?? null,
              lengthMm: v.lengthMm ?? null,
              widthMm: v.widthMm ?? null,
              heightMm: v.heightMm ?? null,
              isDefault: v.isDefault ?? false,
              displayOrder: v.displayOrder ?? 0,
              attributesJson: v.attributesJson ? JSON.parse(v.attributesJson) : {},
              status: 'ACTIVE' as any,
            },
          });
        }
      }

      if (dto.attributeValues && dto.attributeValues.length > 0) {
        for (const av of dto.attributeValues) {
          await tx.productAttributeValue.create({
            data: {
              productId: created.id,
              attributeId: av.attributeId,
              valueText: av.valueText ?? null,
              valueNumber: av.valueNumber ?? null,
              valueBoolean: av.valueBoolean ?? null,
              valueColorHex: av.valueColorHex ?? null,
              valueListValue: av.valueListValue ?? null,
            },
          });
        }
      }

      if (!dto.imageMediaIds || dto.imageMediaIds.length === 0) {
        throw new ProductMustHaveImageException();
      }

      for (let i = 0; i < dto.imageMediaIds.length; i++) {
        await tx.productImage.create({
          data: {
            productId: created.id,
            mediaId: dto.imageMediaIds[i],
            altText: null,
            displayOrder: i,
            isPrimary: i === 0,
          },
        });
      }

      return created;
    });

    return this.getProductById(product.id);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductDetailDto> {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ProductNotFoundException(id);

    if (dto.slug && dto.slug !== existing.slug) {
      if (await this.slugExists(dto.slug, 'product')) {
        throw new SlugAlreadyExistsException(dto.slug, 'product');
      }
    }

    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, deletedAt: null } });
      if (!cat) throw new CategoryNotFoundException(dto.categoryId);
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
      if (!brand) throw new BrandNotFoundException(dto.brandId);
    }

    const updateData: Prisma.ProductUpdateInput & Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.categoryId !== undefined) (updateData as any).categoryId = dto.categoryId;
    if (dto.brandId !== undefined) (updateData as any).brandId = dto.brandId;
    if (dto.shortDescription !== undefined) updateData.shortDesc = dto.shortDescription;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.basePrice !== undefined) {
      if (dto.basePrice < 0) throw new InvalidPriceException();
      updateData.basePrice = dto.basePrice;
    }
    if (dto.compareAtPrice !== undefined) updateData.compareAtPrice = dto.compareAtPrice;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
    if (dto.isNewArrival !== undefined) updateData.isNewArrival = dto.isNewArrival;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle;
    if (dto.metaDesc !== undefined) updateData.metaDesc = dto.metaDesc;

    await this.prisma.product.update({ where: { id }, data: updateData });
    return this.getProductById(id);
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ProductNotFoundException(id);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED as any },
    });
  }

  async publishProduct(id: string): Promise<ProductDetailDto> {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ProductNotFoundException(id);

    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.PUBLISHED as any, publishedAt: new Date() },
    });

    return this.getProductById(id);
  }

  async unpublishProduct(id: string): Promise<ProductDetailDto> {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ProductNotFoundException(id);

    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.UNPUBLISHED as any },
    });

    return this.getProductById(id);
  }

  async restoreProduct(id: string): Promise<ProductDetailDto> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new ProductNotFoundException(id);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: null, status: ProductStatus.DRAFT as any },
    });

    return this.getProductById(id);
  }

  async bulkPublish(ids: string[]): Promise<BulkOperationResultDto> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
        if (!existing) { failed.push({ id, reason: 'Not found' }); continue; }
        await this.prisma.product.update({
          where: { id },
          data: { status: ProductStatus.PUBLISHED as any, publishedAt: new Date() },
        });
        succeeded.push(id);
      } catch (err: unknown) {
        failed.push({ id, reason: (err as Error).message ?? 'Unknown error' });
      }
    }

    return { succeeded, failed };
  }

  async bulkUnpublish(ids: string[]): Promise<BulkOperationResultDto> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
        if (!existing) { failed.push({ id, reason: 'Not found' }); continue; }
        await this.prisma.product.update({
          where: { id },
          data: { status: ProductStatus.UNPUBLISHED as any },
        });
        succeeded.push(id);
      } catch (err: unknown) {
        failed.push({ id, reason: (err as Error).message ?? 'Unknown error' });
      }
    }

    return { succeeded, failed };
  }

  // =============================================================================
  //  VARIANT CRUD
  // =============================================================================

  async listVariants(productId: string): Promise<ProductVariantResponseDto[]> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new ProductNotFoundException(productId);

    const variants = await this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
      include: {
        images: { where: { deletedAt: null }, take: 1, include: { media: true } },
        inventory: true,
      },
    });

    return variants.map((v) => this.mapVariantToResponse(v));
  }

  async getVariant(productId: string, variantId: string): Promise<ProductVariantResponseDto> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new ProductNotFoundException(productId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
      include: {
        images: { where: { deletedAt: null }, take: 1, include: { media: true } },
        inventory: true,
      },
    });
    if (!variant) throw new VariantNotFoundException(variantId);

    return this.mapVariantToResponse(variant);
  }

  async createVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariantResponseDto> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new ProductNotFoundException(productId);

    if (dto.price < 0) throw new InvalidPriceException();
    if (await this.variantSkuExists(dto.sku)) {
      throw new SkuAlreadyExistsException(dto.sku);
    }

    const variant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productVariant.create({
        data: {
          productId,
          sku: dto.sku,
          barcode: dto.barcode ?? null,
          name: dto.name,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice ?? null,
          cost: dto.cost ?? null,
          weightGrams: dto.weightGrams ?? null,
          lengthMm: dto.lengthMm ?? null,
          widthMm: dto.widthMm ?? null,
          heightMm: dto.heightMm ?? null,
          isDefault: dto.isDefault ?? false,
          displayOrder: dto.displayOrder ?? 0,
          attributesJson: dto.attributesJson ? JSON.parse(dto.attributesJson) : {},
          status: 'ACTIVE' as any,
        },
      });

      await tx.inventory.create({
        data: {
          productVariantId: created.id,
          warehouseCode: 'MAIN',
          onHand: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
        },
      });

      if (dto.imageMediaIds && dto.imageMediaIds.length > 0) {
        for (let i = 0; i < dto.imageMediaIds.length; i++) {
          await tx.productImage.create({
            data: {
              productId,
              variantId: created.id,
              mediaId: dto.imageMediaIds[i],
              altText: null,
              displayOrder: i,
              isPrimary: false,
            },
          });
        }
      }

      return created;
    });

    const full = await this.prisma.productVariant.findUnique({
      where: { id: variant.id },
      include: {
        images: { where: { deletedAt: null }, take: 1, include: { media: true } },
        inventory: true,
      },
    });

    return this.mapVariantToResponse(full!);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariantResponseDto> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new ProductNotFoundException(productId);

    const existing = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
    });
    if (!existing) throw new VariantNotFoundException(variantId);

    if (dto.sku && dto.sku !== existing.sku) {
      if (await this.variantSkuExists(dto.sku)) {
        throw new SkuAlreadyExistsException(dto.sku);
      }
    }

    const updateData: Prisma.ProductVariantUpdateInput = {};
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.price !== undefined) {
      if (dto.price < 0) throw new InvalidPriceException();
      updateData.price = dto.price;
    }
    if (dto.compareAtPrice !== undefined) updateData.compareAtPrice = dto.compareAtPrice;
    if (dto.cost !== undefined) updateData.cost = dto.cost;
    if (dto.weightGrams !== undefined) updateData.weightGrams = dto.weightGrams;
    if (dto.lengthMm !== undefined) updateData.lengthMm = dto.lengthMm;
    if (dto.widthMm !== undefined) updateData.widthMm = dto.widthMm;
    if (dto.heightMm !== undefined) updateData.heightMm = dto.heightMm;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;

    await this.prisma.productVariant.update({ where: { id: variantId }, data: updateData });

    const full = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        images: { where: { deletedAt: null }, take: 1, include: { media: true } },
        inventory: true,
      },
    });

    return this.mapVariantToResponse(full!);
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new ProductNotFoundException(productId);

    const existing = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
    });
    if (!existing) throw new VariantNotFoundException(variantId);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date() },
    });
  }

  async updateVariantPrice(
    productId: string,
    variantId: string,
    dto: UpdateVariantPriceDto,
  ): Promise<ProductVariantResponseDto> {
    if (dto.price < 0) throw new InvalidPriceException();

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
    });
    if (!variant) throw new VariantNotFoundException(variantId);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { price: dto.price, compareAtPrice: dto.compareAtPrice ?? null },
    });

    const full = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        images: { where: { deletedAt: null }, take: 1, include: { media: true } },
        inventory: true,
      },
    });

    return this.mapVariantToResponse(full!);
  }

  // =============================================================================
  //  ATTRIBUTES (Admin)
  // =============================================================================

  async listAttributes() {
    return this.prisma.productAttribute.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: { values: true },
    });
  }

  async createAttribute(dto: {
    code: string;
    displayName: string;
    dataType?: string;
    unit?: string;
    isFilterable?: boolean;
    isRequired?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.productAttribute.create({
      data: {
        code: dto.code,
        displayName: dto.displayName,
        dataType: (dto.dataType ?? 'TEXT') as any,
        unit: dto.unit ?? null,
        isFilterable: dto.isFilterable ?? true,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateAttribute(
    id: string,
    dto: {
      code?: string;
      displayName?: string;
      dataType?: string;
      unit?: string;
      isFilterable?: boolean;
      isRequired?: boolean;
      sortOrder?: number;
    },
  ) {
    const updateData: Prisma.ProductAttributeUpdateInput = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.dataType !== undefined) updateData.dataType = dto.dataType as any;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.isFilterable !== undefined) updateData.isFilterable = dto.isFilterable;
    if (dto.isRequired !== undefined) updateData.isRequired = dto.isRequired;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    return this.prisma.productAttribute.update({ where: { id }, data: updateData });
  }

  async deleteAttribute(id: string) {
    await this.prisma.productAttribute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // =============================================================================
  //  INVENTORY (read-only)
  // =============================================================================

  async getVariantStock(variantId: string): Promise<{ available: number; onHand: number; lowStock: boolean }> {
    const inv = await this.prisma.inventory.findUnique({ where: { productVariantId: variantId } });
    if (!inv) return { available: 0, onHand: 0, lowStock: true };
    return {
      available: inv.available,
      onHand: inv.onHand,
      lowStock: inv.available <= inv.lowStockThreshold,
    };
  }

  // =============================================================================
  //  MAPPERS / HELPERS
  // =============================================================================

  private mapVariantToResponse(v: {
    id: string; sku: string; barcode: string | null; name: string; price: unknown;
    compareAtPrice: unknown; weightGrams: number | null;
    attributesJson: unknown; isDefault: boolean; status: string;
    images?: Array<{
      media?: { secureUrl: string } | null;
      altText: string | null;
      displayOrder: number;
      isPrimary: boolean;
    }>;
    inventory?: { available: number; lowStockThreshold: number } | null;
  }): ProductVariantResponseDto {
    const attrs = typeof v.attributesJson === 'object' ? (v.attributesJson as Record<string, unknown>) : {};
    const attrEntries = Object.entries(attrs).map(([k, val]) => ({ name: k, value: String(val) }));
    const img = v.images?.[0];

    return {
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      name: v.name,
      price: d2n(v.price as any),
      compareAtPrice: d2n(v.compareAtPrice as any),
      currency: 'VND',
      weightGrams: v.weightGrams,
      inStock: (v.inventory?.available ?? 0) > 0,
      stockCount: v.inventory?.available ?? 0,
      lowStock: (v.inventory?.available ?? 0) <= (v.inventory?.lowStockThreshold ?? 5),
      attributes: attrEntries,
      imageUrl: img?.media ? (img.media as any).secureUrl ?? null : null,
      isDefault: v.isDefault,
      status: v.status,
    };
  }

  private mapProductToListItem(p: {
    id: string; slug: string; name: string; shortDesc: string | null;
    basePrice: unknown; compareAtPrice: unknown; ratingAvg: unknown; ratingCount: number | null;
    createdAt: Date; publishedAt: Date | null; tags: string[];
    category: { id: string; name: string; slug: string };
    brand: { id: string; name: string; slug: string } | null;
    images?: Array<{ altText: string | null }>;
    variants?: Array<{ price: unknown; status: string; inventory?: { available: number } | null }>;
  }): ProductListItemDto {
    const primary = p.images?.[0] ?? null;
    const prices = p.variants?.map((v) => d2n(v.price as any)) ?? [];
    const minPriceVal = prices.length > 0 ? Math.min(...prices) : d2n(p.basePrice as any);
    const maxPriceVal = prices.length > 0 ? Math.max(...prices) : d2n(p.basePrice as any);
    const hasStock =
      p.variants?.some((v) => v.status === 'ACTIVE' && (v.inventory?.available ?? 0) > 0) ?? false;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDesc,
      brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
      category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
      primaryImage: primary ? { url: '', altText: primary.altText } : null,
      basePrice: d2n(p.basePrice as any),
      compareAtPrice: d2n(p.compareAtPrice as any),
      currency: 'VND',
      hasVariants: (p.variants?.length ?? 0) > 0,
      priceRange:
        prices.length > 1 ? { min: minPriceVal, max: maxPriceVal, currency: 'VND' } : null,
      inStock: hasStock,
      averageRating: d2n(p.ratingAvg as any),
      reviewCount: p.ratingCount ?? 0,
      createdAt: dt2s(p.createdAt)!,
      publishedAt: dt2s(p.publishedAt),
      tags: p.tags ?? [],
    };
  }

  private parseSort(sort: string): Array<Prisma.ProductOrderByWithRelationInput> {
    switch (sort) {
      case 'priceAsc':
        return [{ basePrice: 'asc' }];
      case 'priceDesc':
        return [{ basePrice: 'desc' }];
      case 'nameAsc':
        return [{ name: 'asc' }];
      case 'nameDesc':
        return [{ name: 'desc' }];
      case 'createdDesc':
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}

