"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/stores/cart-context";
import D17PaymentModal from "@/components/marketplace/D17PaymentModal";
import type { Product } from "@/types";

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, loading: cartLoading, isAuthenticated } = useCart();
  // Which cart item's D17 payment modal is open (null = closed).
  // The quantity is kept so the modal charges for every unit in the cart row,
  // not just one.
  const [d17Item, setD17Item] = useState<{ product: Product; quantity: number } | null>(null);

  // Calculate total from cart items
  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.product?.sale_price || item.product?.price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  /**
   * Flouci prices the transaction from the product's database price, so each
   * one-time item is paid on its own checkout page. The server reads the
   * amount from the database and returns the payment URL.
   */
  const canPayDirectly = (productId: string) => {
    const item = cartItems.find((c) => c.product_id === productId);
    if (!item?.product) return false;
    if (item.product.product_type === "subscription") return false;
    return true;
  };

  const hasSubscription = cartItems.some((c) => c.product?.product_type === "subscription");
  const payableItems = cartItems.filter((c) => canPayDirectly(c.product_id));
  const singlePayable = payableItems.length === 1 && cartItems.length === 1;

  if (cartLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"
          />
          <p className="text-muted-foreground">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto"
          >
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground">
            {isAuthenticated
              ? "You haven't added any products to your cart yet."
              : "Sign in to start shopping and add items to your cart."}
          </p>
          <Link href="/marketplace">
            <Button className="gradient-bg text-white border-0">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/marketplace"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>

        <h1 className="text-3xl font-bold mb-8">
          Shopping Cart{" "}
          <span className="text-muted-foreground text-lg font-normal">
            ({cartItems.length} item{cartItems.length !== 1 ? "s" : ""})
          </span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4"
                >
                  <div className="w-full sm:w-24 h-32 sm:h-24 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-8 h-8 text-white/50" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{item.product?.title || "Product"}</h3>
                        <Badge variant="secondary" className="text-xs capitalize mt-1">
                          {item.product?.category || "product"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="text-right">
                        {item.product?.sale_price ? (
                          <div>
                            <span className="font-bold text-primary">
                              {formatPrice(item.product.sale_price * item.quantity)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through ml-2">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold">
                            {formatPrice((item.product?.price || 0) * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Per-item Flouci purchase */}
                    {item.product?.product_type === "subscription" ? (
                      <Link
                        href={`/marketplace/${item.product.slug}`}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 w-full sm:w-auto rounded-lg border border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white text-sm font-medium transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Choose a plan
                      </Link>
                    ) : canPayDirectly(item.product_id) && item.product ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          className="h-10 px-4 w-full sm:w-auto border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white"
                          onClick={() => setD17Item({ product: item.product!, quantity: item.quantity })}
                        >
                          <Smartphone className="w-4 h-4 mr-2" />
                          Pay with D17
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 px-4 w-full sm:w-auto opacity-60 cursor-not-allowed"
                          disabled
                          aria-disabled="true"
                          title="Online card payment is coming soon — use D17 to pay now"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Coming soon
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Payment unavailable for this product
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6 sticky top-24 space-y-6">
              <h2 className="text-xl font-semibold">Order Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="gradient-text">{formatPrice(getTotal())}</span>
                </div>
              </div>

<Button
                className="w-full h-12 gradient-bg text-white border-0 opacity-60 cursor-not-allowed rounded-xl"
                disabled
                aria-disabled="true"
                title="Online card payment is coming soon — use D17 on an item below"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Online payment coming soon
                </span>
              </Button>

              {!singlePayable && (
                <p className="text-xs text-muted-foreground text-center">
                  Each product is paid on its own, so a cart with several items
                  is paid item by item. Use “Pay with D17” on any item below.
                </p>
              )}

              {hasSubscription && (
                <p className="text-xs text-muted-foreground text-center">
                  Subscriptions are purchased on the product page, where you choose a plan.
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <ShieldCheck className="w-4 h-4" />
                Pay by D17 mobile transfer — an admin verifies each payment
              </div>
            </div>
          </div>
        </div>

        {d17Item && (
          <D17PaymentModal
            open={d17Item !== null}
            onOpenChange={(open) => {
              if (!open) setD17Item(null);
            }}
            product={d17Item.product}
            quantity={d17Item.quantity}
          />
        )}
      </div>
    </div>
  );
}