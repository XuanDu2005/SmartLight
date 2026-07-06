// Re-export all catalog exceptions so consumers only import from here.
export {
  ProductNotFoundException,
  CategoryNotFoundException,
  BrandNotFoundException,
  VariantNotFoundException,
  InvalidPriceException,
  OutOfStockException,
  SlugAlreadyExistsException,
  SkuAlreadyExistsException,
  ProductMustHaveCategoryException,
  ProductMustHaveImageException,
  CategoryHasProductsException,
  CategoryHasChildrenException,
  BrandHasProductsException,
  VariantInActiveOrderException,
  ProductInActiveOrderException,
} from './catalog.exceptions';
