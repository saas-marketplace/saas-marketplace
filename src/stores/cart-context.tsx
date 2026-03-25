"use client";

/**
 * cart-context.tsx
 * ════════════════
 * Cart state for the marketplace.
 *
 * ✅ No getSession() / users table query — reads role from AuthProvider.
 * ✅ Skips cart entirely for admin / super_admin (same behavior, zero queries).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Product } from "@/types";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  loading: boolean;
  isAuthenticated: boolean;
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const supabase = createClient();

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fetchedRef = useRef(false);

  // ✅ Get user from AuthProvider — no extra getSession/users calls
  const { authData, loading: authLoading } = useAuth();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const fetchCart = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("cart")
      .select("*, products(*)")
      .eq("user_id", userId);

    if (data) {
      setCartItems(
        data.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.products as Product,
        }))
      );
    }
    setLoading(false);
  }, []);

  // React to auth changes from the shared provider
  useEffect(() => {
    if (authLoading) return;

    if (!authData) {
      setCartItems([]);
      setIsAuthenticated(false);
      setLoading(false);
      fetchedRef.current = false;
      return;
    }

    setIsAuthenticated(true);

    // ✅ Skip cart for admins — role already known from cache, no extra query
    if (authData.role === "admin" || authData.role === "super_admin") {
      setCartItems([]);
      setLoading(false);
      return;
    }

    // Regular user — load cart once
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchCart(authData.id);
    }
  }, [authData, authLoading, fetchCart]);

  // Real-time auth listener for SIGNED_IN / SIGNED_OUT events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event:string) => {
        if (event === "SIGNED_OUT") {
          setCartItems([]);
          setIsAuthenticated(false);
          fetchedRef.current = false;
        }
        // SIGNED_IN is handled by the authData effect above
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const addToCart = useCallback(
    async (product: Product) => {
      if (!authData?.id) return;

      const { data: existing } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", authData.id)
        .eq("product_id", product.id)
        .single();

      if (existing) {
        await supabase
          .from("cart")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart").insert({
          user_id: authData.id,
          product_id: product.id,
          quantity: 1,
        });
      }

      await fetchCart(authData.id);
    },
    [authData, fetchCart]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      if (!authData?.id) return;
      await supabase
        .from("cart")
        .delete()
        .eq("user_id", authData.id)
        .eq("product_id", productId);
      await fetchCart(authData.id);
    },
    [authData, fetchCart]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (!authData?.id) return;
      if (quantity <= 0) {
        await supabase
          .from("cart")
          .delete()
          .eq("user_id", authData.id)
          .eq("product_id", productId);
      } else {
        await supabase
          .from("cart")
          .update({ quantity })
          .eq("user_id", authData.id)
          .eq("product_id", productId);
      }
      await fetchCart(authData.id);
    },
    [authData, fetchCart]
  );

  const clearCart = useCallback(() => setCartItems([]), []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        loading,
        isAuthenticated,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}