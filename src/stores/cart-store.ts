"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist<CartStore>(
    (set: (fn: (state: CartStore) => Partial<CartStore>) => void, get: () => CartStore) => ({
      items: [] as CartItem[],

      addItem: (product: Product) => {
        const items = get().items;
        const existingItem = items.find(
          (item: CartItem) => item.product.id === product.id
        );

        if (existingItem) {
          set(() => ({
            items: items.map((item: CartItem) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          }));
        } else {
          set(() => ({ items: [...items, { product, quantity: 1 }] }));
        }
      },

      removeItem: (productId: string) => {
        set(() => ({
          items: get().items.filter((item: CartItem) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set(() => ({
          items: get().items.map((item: CartItem) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set(() => ({ items: [] })),

      getTotal: () => {
        return get().items.reduce((total: number, item: CartItem) => {
          const price = item.product.sale_price || item.product.price;
          return total + price * item.quantity;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count: number, item: CartItem) => count + item.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
    }
  )
);