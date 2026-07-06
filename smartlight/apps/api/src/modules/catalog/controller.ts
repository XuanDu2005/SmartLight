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
} from '@nestjs/common';
import { CatalogService } from './service';
import {
  ListCategoriesQueryDto,
  ListBrandsQueryDto,
  ListProductsQueryDto,
  AdminListProductsQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  UpdateVariantPriceDto,
  CreateAttributeDto,
  UpdateAttributeDto,
  BulkPublishDto,
  BulkUnpublishDto,
  FeaturedProductsQueryDto,
  BestSellersQueryDto,
} from './dto/catalog-request.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * CatalogController — all public product/category/brand browsing routes (no auth)
 * and admin CRUD routes protected by @Roles('admin', 'catalog_manager').
 *
 * Authentication is handled globally by JwtAuthGuard (APP_GUARD in app.module.ts).
 * Authorization (role checks) is handled by RolesGuard (APP_GUARD in app.module.ts).
 * The @Roles() decorator on each admin route specifies the required roles.
 */
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // =============================================================================
  //  PUBLIC — Categories
  // =============================================================================

  @Public()
  @Get('catalog/categories')
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.catalog.listCategories({
      parentId: query.parentId,
      isActive: query.isActive,
      limit: query.limit,
      sort: query.sort,
    });
  }

  @Public()
  @Get('catalog/categories/tree')
  async getCategoryTree() {
    return this.catalog.getCategoryTree();
  }

  @Public()
  @Get('catalog/categories/:id')
  async getCategory(@Param('id') id: string) {
    const result = await this.catalog.getCategoryById(id);
    return { data: result };
  }

  // =============================================================================
  //  PUBLIC — Brands
  // =============================================================================

  @Public()
  @Get('catalog/brands')
  async listBrands(@Query() query: ListBrandsQueryDto) {
    return this.catalog.listBrands({
      isActive: query.isActive,
      limit: query.limit,
      sort: query.sort,
    });
  }

  @Public()
  @Get('catalog/brands/:id')
  async getBrand(@Param('id') id: string) {
    const result = await this.catalog.getBrandById(id);
    return { data: result };
  }

  // =============================================================================
  //  PUBLIC — Products
  // =============================================================================

  @Public()
  @Get('catalog/products')
  async listProducts(@Query() query: ListProductsQueryDto) {
    return this.catalog.listProducts({
      q: query.q,
      categoryId: query.categoryId,
      categorySlug: query.categorySlug,
      brandId: query.brandId,
      brandSlug: query.brandSlug,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
      featured: query.featured,
      newArrival: query.newArrival,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  @Public()
  @Get('catalog/products/featured')
  async getFeaturedProducts(@Query() query: FeaturedProductsQueryDto) {
    const data = await this.catalog.listFeaturedProducts(query.limit ?? 12);
    return { data };
  }

  @Public()
  @Get('catalog/products/best-sellers')
  async getBestSellers(@Query() query: BestSellersQueryDto) {
    const data = await this.catalog.listBestSellers(query.limit ?? 12);
    return { data };
  }

  @Public()
  @Get('catalog/products/new-arrivals')
  async getNewArrivals(@Query() query: FeaturedProductsQueryDto) {
    const data = await this.catalog.listNewArrivals(query.limit ?? 12);
    return { data };
  }

  @Public()
  @Get('catalog/products/slug/:slug')
  async getProductBySlug(
    @Param('slug') slug: string,
    @Query('include') include?: string,
  ) {
    const includes = include ? include.split(',').map((s) => s.trim()) : [];
    const result = await this.catalog.getProductBySlug(slug, includes);
    return { data: result };
  }

  @Public()
  @Get('catalog/products/:id')
  async getProduct(
    @Param('id') id: string,
    @Query('include') include?: string,
  ) {
    const includes = include ? include.split(',').map((s) => s.trim()) : [];
    const result = await this.catalog.getProductById(id, includes);
    return { data: result };
  }

  // =============================================================================
  //  PUBLIC — Variants
  // =============================================================================

  @Public()
  @Get('catalog/products/:productId/variants')
  async listVariants(@Param('productId') productId: string) {
    const data = await this.catalog.listVariants(productId);
    return { data };
  }

  @Public()
  @Get('catalog/products/:productId/variants/:variantId')
  async getVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    const result = await this.catalog.getVariant(productId, variantId);
    return { data: result };
  }

  // =============================================================================
  //  PUBLIC — Attributes
  // =============================================================================

  @Public()
  @Get('catalog/attributes')
  async listAttributes() {
    const data = await this.catalog.listAttributes();
    return { data };
  }

  // =============================================================================
  //  ADMIN — Categories
  // =============================================================================

  @Post('admin/catalog/categories')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto) {
    const result = await this.catalog.createCategory(dto);
    return { data: result };
  }

  @Patch('admin/catalog/categories/:id')
  @Roles('admin', 'catalog_manager')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const result = await this.catalog.updateCategory(id, dto);
    return { data: result };
  }

  @Delete('admin/catalog/categories/:id')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string) {
    await this.catalog.deleteCategory(id);
  }

  @Post('admin/catalog/categories/:id/restore')
  @Roles('admin', 'catalog_manager')
  async restoreCategory(@Param('id') id: string) {
    const result = await this.catalog.restoreCategory(id);
    return { data: result };
  }

  // =============================================================================
  //  ADMIN — Brands
  // =============================================================================

  @Post('admin/catalog/brands')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.CREATED)
  async createBrand(@Body() dto: CreateBrandDto) {
    const result = await this.catalog.createBrand(dto);
    return { data: result };
  }

  @Patch('admin/catalog/brands/:id')
  @Roles('admin', 'catalog_manager')
  async updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const result = await this.catalog.updateBrand(id, dto);
    return { data: result };
  }

  @Delete('admin/catalog/brands/:id')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBrand(@Param('id') id: string) {
    await this.catalog.deleteBrand(id);
  }

  // =============================================================================
  //  ADMIN — Products
  // =============================================================================

  @Post('admin/catalog/products')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() dto: CreateProductDto) {
    const result = await this.catalog.createProduct(dto);
    return { data: result };
  }

  @Patch('admin/catalog/products/:id')
  @Roles('admin', 'catalog_manager')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const result = await this.catalog.updateProduct(id, dto);
    return { data: result };
  }

  @Delete('admin/catalog/products/:id')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    await this.catalog.deleteProduct(id);
  }

  @Post('admin/catalog/products/:id/publish')
  @Roles('admin', 'catalog_manager')
  async publishProduct(@Param('id') id: string) {
    const result = await this.catalog.publishProduct(id);
    return { data: result };
  }

  @Post('admin/catalog/products/:id/unpublish')
  @Roles('admin', 'catalog_manager')
  async unpublishProduct(@Param('id') id: string) {
    const result = await this.catalog.unpublishProduct(id);
    return { data: result };
  }

  @Post('admin/catalog/products/:id/restore')
  @Roles('admin', 'catalog_manager')
  async restoreProduct(@Param('id') id: string) {
    const result = await this.catalog.restoreProduct(id);
    return { data: result };
  }

  @Post('admin/catalog/products/bulk-publish')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.OK)
  async bulkPublish(@Body() dto: BulkPublishDto) {
    const result = await this.catalog.bulkPublish(dto.ids);
    return { data: result };
  }

  @Post('admin/catalog/products/bulk-unpublish')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.OK)
  async bulkUnpublish(@Body() dto: BulkUnpublishDto) {
    const result = await this.catalog.bulkUnpublish(dto.ids);
    return { data: result };
  }

  @Get('admin/catalog/products')
  @Roles('admin', 'catalog_manager')
  async listProductsAdmin(@Query() query: AdminListProductsQueryDto) {
    return this.catalog.listProducts(query);
  }

  // =============================================================================
  //  ADMIN — Variants
  // =============================================================================

  @Post('admin/catalog/products/:productId/variants')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.CREATED)
  async createVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    const result = await this.catalog.createVariant(productId, dto);
    return { data: result };
  }

  @Patch('admin/catalog/products/:productId/variants/:variantId')
  @Roles('admin', 'catalog_manager')
  async updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const result = await this.catalog.updateVariant(productId, variantId, dto);
    return { data: result };
  }

  @Delete('admin/catalog/products/:productId/variants/:variantId')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    await this.catalog.deleteVariant(productId, variantId);
  }

  @Post('admin/catalog/products/:productId/variants/:variantId/price')
  @Roles('admin', 'catalog_manager')
  async updateVariantPrice(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantPriceDto,
  ) {
    const result = await this.catalog.updateVariantPrice(productId, variantId, dto);
    return { data: result };
  }

  // =============================================================================
  //  ADMIN — Attributes
  // =============================================================================

  @Post('admin/catalog/attributes')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.CREATED)
  async createAttribute(@Body() dto: CreateAttributeDto) {
    const result = await this.catalog.createAttribute(dto);
    return { data: result };
  }

  @Patch('admin/catalog/attributes/:id')
  @Roles('admin', 'catalog_manager')
  async updateAttribute(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    const result = await this.catalog.updateAttribute(id, dto);
    return { data: result };
  }

  @Delete('admin/catalog/attributes/:id')
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttribute(@Param('id') id: string) {
    await this.catalog.deleteAttribute(id);
  }
}
