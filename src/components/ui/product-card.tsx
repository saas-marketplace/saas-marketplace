"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingCart, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/stores/cart-context";
import { useToast } from "@/components/ui/use-toast";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

const categoryLabels: Record<string, string> = {
  ebooks: "E-Book",
  templates: "Template",
  design: "Design",
  assets: "Asset",
};

export default function ProductCard({ product }: ProductCardProps) {
  const displayPrice = product.sale_price || product.price;
  const isOnSale = product.sale_price && product.sale_price < product.price;
  const { addToCart, isAuthenticated } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Redirect guests to registration page - privacy requirement
    if (!isAuthenticated) {
      router.push('/auth/register');
      return;
    }
    
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.title} has been added to your cart.`,
      duration: 2000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-lg hover:shadow-cyan-400/10 dark:hover:shadow-cyan-500/10 transition-all"
    >
      <div className="aspect-video relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          </div>
        )}
        {isOnSale && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            Sale
          </Badge>
        )}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-primary">
            Featured
          </Badge>
        )}
      </div>

      <div className="p-4">
        {product.category && (
          <Badge variant="secondary" className="mb-2">
            {categoryLabels[product.category] || product.category}
          </Badge>
        )}

        <h3 className="font-semibold text-lg line-clamp-1 mb-1 text-[#0A0A0A] dark:text-white">
          {product.title}
        </h3>
        
        {product.description && (
          <p className="text-[#525252] dark:text-gray-400 text-sm line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#0A0A0A] dark:text-white">
              {formatPrice(displayPrice)}
            </span>
            {isOnSale && product.price && (
              <span className="text-sm text-[#737373] dark:text-gray-500 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/marketplace/${product.slug || product.id}`}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddToCart}>
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>

        {(product.download_count > 0 || product.like_count > 0) && (
          <div className="mt-3 flex items-center gap-4 text-xs text-[#737373] dark:text-gray-400">
            {product.download_count > 0 && (
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>{product.download_count}</span>
              </div>
            )}
            {product.like_count > 0 && (
              <span>{product.like_count} likes</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
