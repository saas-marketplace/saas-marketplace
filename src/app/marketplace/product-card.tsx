"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Star, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/components/ui/use-toast";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  isLiked: boolean;
  onLikeToggle: (id: string) => void;
}

const categoryGradients: Record<string, string> = {
  ebooks: "from-blue-500 to-cyan-500",
  templates: "from-purple-500 to-pink-500",
  design: "from-orange-500 to-red-500",
  assets: "from-green-500 to-teal-500",
};

const categoryLabels: Record<string, string> = {
  ebooks: "E-Book",
  templates: "Template",
  design: "Design",
  assets: "Asset",
};

export function ProductCard({
  product,
  isLiked,
  onLikeToggle,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const addItem = useCartStore((state: { addItem: (p: Product) => void }) => state.addItem);
  const { toast } = useToast();

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikeAnimating(true);
    onLikeToggle(product.id);
    setTimeout(() => setLikeAnimating(false), 600);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({
      title: "Added to cart!",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const discount = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  return (
    <Link href={`/marketplace/${product.slug}`}>
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -8 }}
        className="glass-card rounded-2xl overflow-hidden group cursor-pointer h-full flex flex-col"
      >
        <div className="relative h-48 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              categoryGradients[product.category] || "from-gray-500 to-gray-700"
            }`}
          />
          <div className="absolute inset-0 bg-black/10" />

          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge className="bg-white/20 text-white backdrop-blur-sm border-0 text-xs">
              {categoryLabels[product.category]}
            </Badge>
            {discount > 0 && (
              <Badge className="bg-red-500 text-white border-0 text-xs">
                -{discount}%
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-yellow-500 text-white border-0 text-xs">
                <Star className="w-3 h-3 mr-1 fill-white" />
                Featured
              </Badge>
            )}
          </div>

          <button
            onClick={handleLike}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/30"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isLiked ? "liked" : "unliked"}
                initial={{ scale: 0 }}
                animate={{ scale: likeAnimating ? [1, 1.5, 1] : 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isLiked ? "text-red-500 fill-red-500" : "text-white"
                  }`}
                />
              </motion.div>
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button size="sm" variant="secondary" className="rounded-full">
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            {product.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {product.description}
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {product.like_count}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {product.download_count}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              {product.sale_price ? (
                <>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(product.sale_price)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="gradient-bg text-white border-0 hover:opacity-90 rounded-full"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}