/**
 * Cart slice — single source of truth for the customer's cart state.
 *
 * Hydrated from the backend (`GET /v1/cart`) when the customer
 * authenticates. Mutations are issued via thunks that call the
 * cart-api and update local state on success.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { cartApi, type CartDto } from '../lib/cart-api';

export interface CartState {
  cart: CartDto | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** Pending add-to-cart variantIds — used to disable buttons / show spinners. */
  pendingVariants: string[];
}

const initialState: CartState = {
  cart: null,
  status: 'idle',
  error: null,
  pendingVariants: [],
};

export const fetchCart = createAsyncThunk('cart/fetch', async () => cartApi.getCart());

export const addCartItem = createAsyncThunk(
  'cart/addItem',
  async (input: { variantId: string; quantity: number }, { dispatch }) => {
    // Always refetch the canonical cart from GET /cart after add to keep
    // `selectedItemCount` and `cart.itemCount` consistent with `items`.
    await cartApi.addItem(input);
    return dispatch(fetchCart()).unwrap();
  },
);

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async (input: { itemId: string; quantity: number }) => {
    return cartApi.updateItem(input.itemId, { quantity: input.quantity });
  },
);

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (itemId: string) => cartApi.removeItem(itemId),
);

export const clearCart = createAsyncThunk('cart/clear', async () => cartApi.clear());

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCart(state) {
      state.cart = null;
      state.status = 'idle';
      state.error = null;
      state.pendingVariants = [];
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.cart = action.payload;
        state.status = 'ready';
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Lỗi tải giỏ hàng';
      })
      .addCase(addCartItem.pending, (state, action) => {
        state.pendingVariants.push(action.meta.arg.variantId);
        state.error = null;
      })
      .addCase(addCartItem.fulfilled, (state, action) => {
        state.cart = action.payload;
        state.status = 'ready';
        state.pendingVariants = state.pendingVariants.filter(
          (v) => v !== action.meta.arg.variantId,
        );
      })
      .addCase(addCartItem.rejected, (state, action) => {
        state.error = action.error.message ?? 'Lỗi thêm sản phẩm';
        state.pendingVariants = [];
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.cart = action.payload;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.error = action.error.message ?? 'Lỗi cập nhật số lượng';
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.cart = action.payload;
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.error = action.error.message ?? 'Lỗi xóa sản phẩm';
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.cart = action.payload;
      });
  },
});

export const { resetCart, setError: setCartError } = cartSlice.actions;
export default cartSlice.reducer;