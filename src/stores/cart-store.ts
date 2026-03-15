"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isLoaded: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  loadFromDatabase: (userId: string) => Promise<void>;
}

// Guest cart store (localStorage)
const useGuestCartStore = create<CartStore>()(
  persist<CartStore>(
    (set, get) => ({
      items: [] as CartItem[],
      isLoaded: true,

      addItem: (product: Product) => {
        const items = get().items;
        const existingItem = items.find(
          (item: CartItem) => item.product.id === product.id
        );

        if (existingItem) {
          set({
            items: items.map((item: CartItem) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity: 1 }] });
        }
      },

      removeItem: (productId: string) => {
        set({
          items: get().items.filter((item: CartItem) => item.product.id !== productId),
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((item: CartItem) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((total: number, item: CartItem) => {
          const price = item.product.sale_price || item.product.price;
          return total + price * item.quantity;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count: number, item: CartItem) => count + item.quantity, 0);
      },

      loadFromDatabase: async () => {
        // No-op for guest
      },
    }),
    {
      name: "guest-cart-storage",
    }
  )
);

// User cart store (database)
const useUserCartStore = create<CartStore>()(
  (set, get) => ({
    items: [] as CartItem[],
    isLoaded: false,

    addItem: async (product: Product) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Check if item exists
      const { data: existing } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .single();

      if (existing) {
        await supabase
          .from("cart")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart").insert({
          user_id: session.user.id,
          product_id: product.id,
          quantity: 1,
        });
      }
    },

    removeItem: async (productId: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase
        .from("cart")
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", productId);
    },

    updateQuantity: async (productId: string, quantity: number) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      if (quantity <= 0) {
        await supabase
          .from("cart")
          .delete()
          .eq("user_id", session.user.id)
          .eq("product_id", productId);
      } else {
        await supabase
          .from("cart")
          .update({ quantity })
          .eq("user_id", session.user.id)
          .eq("product_id", productId);
      }
    },

    clearCart: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from("cart").delete().eq("user_id", session.user.id);
    },

    getTotal: () => {
      return get().items.reduce((total: number, item: CartItem) => {
        const price = item.product.sale_price || item.product.price;
        return total + price * item.quantity;
      }, 0);
    },

    getItemCount: () => {
      return get().items.reduce((count: number, item: CartItem) => count + item.quantity, 0);
    },

    loadFromDatabase: async (userId: string) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("cart")
        .select("*, products(*)")
        .eq("user_id", userId);

      if (data && data.length > 0) {
        const items = data
          .filter((item: any) => item.products)
          .map((item: any) => ({
            product: item.products as Product,
            quantity: item.quantity,
          }));
        set({ items, isLoaded: true });
      } else {
        set({ items: [], isLoaded: true });
      }
    },
  })
);

// Export the store - this uses guest store by default
export const useCartStore = useGuestCartStore;

// Export both stores for internal use
export { useGuestCartStore, useUserCartStore };
