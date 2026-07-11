import { HttpException, HttpStatus } from '@nestjs/common';

export class ProductNotFoundException extends HttpException {
  constructor(id?: string) {
    super(
      { code: 'PRODUCT_NOT_FOUND', message: id ? `Product '${id}' not found` : 'Product not found' },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class CategoryNotFoundException extends HttpException {
  constructor(id?: string) {
    super(
      { code: 'CATEGORY_NOT_FOUND', message: id ? `Category '${id}' not found` : 'Category not found' },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class BrandNotFoundException extends HttpException {
  constructor(id?: string) {
    super(
      { code: 'BRAND_NOT_FOUND', message: id ? `Brand '${id}' not found` : 'Brand not found' },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class VariantNotFoundException extends HttpException {
  constructor(id?: string) {
    super(
      { code: 'VARIANT_NOT_FOUND', message: id ? `Variant '${id}' not found` : 'Variant not found' },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidPriceException extends HttpException {
  constructor(message = 'Price must be a positive number') {
    super({ code: 'INVALID_PRICE', message }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class OutOfStockException extends HttpException {
  constructor(variantId?: string) {
    super(
      {
        code: 'OUT_OF_STOCK',
        message: variantId ? `Variant '${variantId}' is out of stock` : 'Requested variant is out of stock',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class SlugAlreadyExistsException extends HttpException {
  constructor(slug: string, entity: string) {
    super(
      { code: 'SLUG_ALREADY_EXISTS', message: `Slug '${slug}' already exists for ${entity}` },
      HttpStatus.CONFLICT,
    );
  }
}

export class SkuAlreadyExistsException extends HttpException {
  constructor(sku: string) {
    super(
      { code: 'SKU_ALREADY_EXISTS', message: `SKU '${sku}' already exists` },
      HttpStatus.CONFLICT,
    );
  }
}

export class ProductMustHaveCategoryException extends HttpException {
  constructor() {
    super(
      { code: 'PRODUCT_MUST_HAVE_CATEGORY', message: 'Product must belong to at least one category' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ProductMustHaveImageException extends HttpException {
  constructor() {
    super(
      { code: 'PRODUCT_MUST_HAVE_IMAGE', message: 'Product must have at least one image' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class CategoryHasProductsException extends HttpException {
  constructor() {
    super(
      { code: 'CATEGORY_HAS_PRODUCTS', message: 'Cannot delete a category that has products' },
      HttpStatus.CONFLICT,
    );
  }
}

export class CategoryHasChildrenException extends HttpException {
  constructor() {
    super(
      { code: 'CATEGORY_HAS_CHILDREN', message: 'Cannot delete a category that has child categories' },
      HttpStatus.CONFLICT,
    );
  }
}

export class BrandHasProductsException extends HttpException {
  constructor() {
    super(
      { code: 'BRAND_HAS_PRODUCTS', message: 'Cannot delete a brand that has products' },
      HttpStatus.CONFLICT,
    );
  }
}

export class VariantInActiveOrderException extends HttpException {
  constructor() {
    super(
      { code: 'VARIANT_IN_ACTIVE_ORDER', message: 'Cannot delete a variant that is part of an active order' },
      HttpStatus.CONFLICT,
    );
  }
}

export class ProductInActiveOrderException extends HttpException {
  constructor() {
    super(
      { code: 'PRODUCT_IN_ACTIVE_ORDER', message: 'Cannot delete a product that has active orders' },
      HttpStatus.CONFLICT,
    );
  }
}

