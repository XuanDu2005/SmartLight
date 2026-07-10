import { ProductFormPage } from './product-form-page';

/**
 * Edit product wrapper — delegates to ProductFormPage with mode=edit.
 */
export const ProductEditPage = (): JSX.Element => (
  <ProductFormPage mode="edit" />
);