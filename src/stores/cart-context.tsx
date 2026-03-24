"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeGetSession } from "../lib/auth-lock-manager";
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  // Calculate count from cart items
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch cart from database - always filtered by current user
  const fetchCart = useCallback(async () => {
    // Use safeGetSession instead of direct supabase.auth.getSession()
    const { session, error } = await safeGetSession();
    
    if (error) {
      console.error('[CartContext] getSession error:', error);
    }
    
    if (!session?.user) {
      setCartItems([]);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    // Check user role - admins don't need cart functionality
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      
      const userRole = userData?.role;
      
      // Skip cart for admin/super_admin to prevent lock conflicts
      if (userRole === 'admin' || userRole === 'super_admin') {
        setCartItems([]);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }
    } catch (roleError) {
      console.log('[CartContext] Could not check user role, proceeding with cart');
    }

    setIsAuthenticated(true);
    setLoading(true);
    
    // Always filter by user_id - security requirement
    const { data } = await supabase
      .from("cart")
      .select("*, products(*)")
      .eq("user_id", session.user.id);

    if (data) {
      const items = data.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        product: item.products as Product,
      }));
      setCartItems(items);
    }
    setLoading(false);
  }, [supabase]);

  // Add to cart - ONLY for authenticated users
  const addToCart = useCallback(async (product: Product) => {
    // Use safeGetSession instead of direct supabase.auth.getSession()
    const { session, error } = await safeGetSession();
    
    if (error) {
      console.error('[CartContext] getSession error:', error);
    }
    
    // Block guests - they cannot add items
    if (!session?.user) {
      console.warn("Guest attempted to add to cart - blocked for privacy");
      return;
    }

    // Check if item already exists in cart
    const { data: existing } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("product_id", product.id)
      .single();

    if (existing) {
      // Update quantity
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      // Insert new item with user_id
      await supabase.from("cart").insert({
        user_id: session.user.id,
        product_id: product.id,
        quantity: 1,
      });
    }

    // Fetch fresh data after action
    await fetchCart();
  }, [supabase, fetchCart]);

  // Remove from cart
  const removeFromCart = useCallback(async (productId: string) => {
    const { session, error } = await safeGetSession();
    
    if (error) {
      console.error('[CartContext] getSession error:', error);
    }
    
    if (!session?.user) return;

    await supabase
      .from("cart")
      .delete()
      .eq("user_id", session.user.id)
      .eq("product_id", productId);

    await fetchCart();
  }, [supabase, fetchCart]);

  // Update quantity
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const { session, error } = await safeGetSession();
    
    if (error) {
      console.error('[CartContext] getSession error:', error);
    }
    
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

    await fetchCart();
  }, [supabase, fetchCart]);

  // Clear cart - just clears local state, keeps database
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Initial load and auth listener
  const fetchedRef = useRef(false);
  
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchCart();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: unknown, session: any) => {
        if (event === "SIGNED_IN" && session?.user) {
          await fetchCart();
        } else if (event === "SIGNED_OUT") {
          // Clear cart on logout - privacy requirement
          setCartItems([]);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [fetchCart, supabase]);

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
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
