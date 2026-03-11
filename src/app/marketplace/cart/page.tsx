"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { loadStripe, Stripe } from "@stripe/stripe-js";

interface CheckoutItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart } =
    useCartStore();
  const [loading, setLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  // Initialize Stripe on mount
  useEffect(() => {
    const initStripe = async () => {
      try {
        const stripe = loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        );
        setStripePromise(stripe);
      } catch (error) {
        console.error("Failed to load Stripe:", error);
        setStripeError("Failed to load payment system. Please refresh and try again.");
      }
    };
    initStripe();
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setStripeError(null);
    try {
      const checkoutItems: CheckoutItem[] = items.map((item) => ({
        id: item.product.id,
        title: item.product.title,
        price: item.product.sale_price || item.product.price,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await response.json();
      
      if (!stripePromise) {
        throw new Error("Payment system not loaded");
      }

      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error("Stripe redirect error:", error);
          setStripeError(error.message || "Payment failed. Please try again.");
        }
      } else {
        setStripeError("Payment system unavailable. Please try again.");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      setStripeError(error.message || "An error occurred during checkout. Please try again.");
    }
    setLoading(false);
  };

  if (items.length === 0) {
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
            Discover amazing digital products in our marketplace.
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
            ({items.length} item{items.length !== 1 ? "s" : ""})
          </span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.product.id}
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
                        <h3 className="font-semibold">{item.product.title}</h3>
                        <Badge variant="secondary" className="text-xs capitalize mt-1">
                          {item.product.category}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.product.id)}
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
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
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
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="text-right">
                        {item.product.sale_price ? (
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
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
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
                className="w-full h-12 gradient-bg text-white border-0 hover:opacity-90 rounded-xl"
                onClick={handleCheckout}
                disabled={loading || !!stripeError}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Checkout with Stripe
                  </span>
                )}
              </Button>

              {stripeError && (
                <div className="flex items-center gap-2 text-xs text-destructive justify-center bg-destructive/10 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {stripeError}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <ShieldCheck className="w-4 h-4" />
                Secure checkout powered by Stripe
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}