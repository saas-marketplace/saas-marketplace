"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { ProductCard } from "@/components/marketplace/product-card";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

const categories = [
  { value: "all", label: "All Products" },
  { value: "ebooks", label: "E-Books" },
  { value: "templates", label: "Templates" },
  { value: "design", label: "Design Resources" },
  { value: "assets", label: "Digital Assets" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
];

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
    fetchUserLikes();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) setProducts(data);
    setLoading(false);
  }

  async function fetchUserLikes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("product_likes")
        .select("product_id")
        .eq("user_id", user.id);

      if (data) {
        setLikedProducts(new Set(data.map((l) => l.product_id)));
      }
    }
  }

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort(
          (a, b) => (a.sale_price || a.price) - (b.sale_price || b.price)
        );
        break;
      case "price-high":
        filtered.sort(
          (a, b) => (b.sale_price || b.price) - (a.sale_price || a.price)
        );
        break;
      case "popular":
        filtered.sort((a, b) => b.like_count - a.like_count);
        break;
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="relative pb-12">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Marketplace
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Premium Digital <span className="gradient-text">Products</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover curated digital resources to supercharge your workflow.
              From templates to ebooks, find everything you need.
            </p>
          </ScrollReveal>

          {/* Search & Filters */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products, templates, ebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg rounded-2xl glass-card border-primary/20 focus:border-primary"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant={
                    selectedCategory === category.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`rounded-full ${
                    selectedCategory === category.value
                      ? "gradient-bg text-white border-0"
                      : "glass-card"
                  }`}
                >
                  {category.label}
                </Button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} product
                {filteredProducts.length !== 1 ? "s" : ""} found
              </p>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm bg-transparent border-0 outline-none cursor-pointer text-muted-foreground"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl glass-card h-96 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">
              No products found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    isLiked={likedProducts.has(product.id)}
                    onLikeToggle={async (id) => {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) return;

                      if (likedProducts.has(id)) {
                        await supabase
                          .from("product_likes")
                          .delete()
                          .eq("user_id", user.id)
                          .eq("product_id", id);
                        setLikedProducts((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      } else {
                        await supabase
                          .from("product_likes")
                          .insert({ user_id: user.id, product_id: id });
                        setLikedProducts((prev) => new Set(prev).add(id));
                      }
                      fetchProducts();
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}