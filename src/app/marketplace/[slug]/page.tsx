"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ShoppingCart, Download, Check, Share2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { Product } from "@/types";

const categoryGradients: Record<string, string> = {
  ebooks: "from-blue-500 to-cyan-500",
  templates: "from-purple-500 to-pink-500",
  design: "from-orange-500 to-red-500",
  assets: "from-green-500 to-teal-500",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const addItem = useCartStore(
    (state: { addItem: (p: Product) => void }) => state.addItem
  );
  const { toast } = useToast();
  const supabase = createClient();

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("slug", params.slug)
      .single();

    if (data) {
      setProduct(data);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: like } = await supabase
          .from("product_likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", data.id)
          .single();
        setIsLiked(!!like);
      }
    }
    setLoading(false);
  }, [supabase, params.slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-32" />
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="h-96 bg-muted rounded-2xl" />
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded w-3/4" />
                <div className="h-6 bg-muted rounded w-1/4" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Button onClick={() => router.push("/marketplace")}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const discount = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </motion.button>

        <div className="grid lg:grid-cols-2 gap-12">
          <ScrollReveal direction="left">
            <div className="relative">
              {product.image_url ? (
                <div className="w-full aspect-square rounded-3xl overflow-hidden bg-muted">
                  <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-full aspect-square rounded-3xl bg-gradient-to-br ${
                    categoryGradients[product.category]
                  } flex items-center justify-center`}
                >
                  <Package className="w-32 h-32 text-white/50" />
                </div>
              )}
              {discount > 0 && (
                <Badge className="absolute top-4 left-4 bg-red-500 text-white border-0 text-sm">
                  Save {discount}%
                </Badge>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3 capitalize">
                  {product.category}
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                  {product.title}
                </h1>

                {product.author_name && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">
                      {product.author_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{product.author_name}</p>
                      <p className="text-xs text-muted-foreground">Creator</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {product.like_count} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {product.download_count} downloads
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-4">
                {product.sale_price ? (
                  <>
                    <span className="text-4xl font-bold text-primary">
                      {formatPrice(product.sale_price)}
                    </span>
                    <span className="text-xl text-muted-foreground line-through">
                      {formatPrice(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-4xl font-bold">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {product.long_description || product.description}
              </p>

              {product.features.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">What&apos;s Included</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.features.map((feature: string) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  className="flex-1 gradient-bg text-white border-0 hover:opacity-90 h-12 rounded-xl"
                  onClick={() => {
                    addItem(product);
                    toast({
                      title: "Added to cart!",
                      description: `${product.title} has been added to your cart.`,
                    });
                  }}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl"
                  onClick={async () => {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;

                    if (isLiked) {
                      await supabase
                        .from("product_likes")
                        .delete()
                        .eq("user_id", user.id)
                        .eq("product_id", product.id);
                    } else {
                      await supabase
                        .from("product_likes")
                        .insert({ user_id: user.id, product_id: product.id });
                    }
                    setIsLiked(!isLiked);
                  }}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isLiked ? "text-red-500 fill-red-500" : ""
                    }`}
                  />
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-xl">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}