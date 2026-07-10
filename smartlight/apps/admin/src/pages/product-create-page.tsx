import { ProductFormPage } from './product-form-page';

/**
 * Create product wrapper — delegates to ProductFormPage with mode=create.
 */
export const ProductCreatePage = (): JSX.Element => (
  <ProductFormPage mode="create" />
);