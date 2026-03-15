"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ProductCard from "@/components/ui/product-card";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

const categories = [
  { value: "", label: "All Products" },
  { value: "templates", label: "Templates" },
  { value: "ebooks", label: "E-Books" },
  { value: "design", label: "Design Assets" },
  { value: "assets", label: "Assets" },
];

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("products").select("*");
      if (!error) setProducts(data || []);
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen gradient-bg-subtle">
      {/* Hero Section */}
      <div className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#0A0A0A] dark:text-white">
              Marketplace{" "}
              <span className="gradient-text">Products</span>
            </h1>
            <p className="text-lg text-[#525252] dark:text-gray-400 mb-8">
              Discover premium templates, e-books, design assets, and more from talented creators
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white dark:bg-[#111111] border-2 border-gray-200 dark:border-white/10 focus:border-cyan-400 dark:focus:border-[#0AA3C8]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.value)}
              className="rounded-full"
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Filter className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-[#0A0A0A] dark:text-white">No products found</h3>
            <p className="text-[#525252] dark:text-gray-400">
              {searchQuery || selectedCategory
                ? "Try adjusting your search or filters"
                : "No products available yet. Check back later!"}
            </p>
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredProducts.length > 0 && (
          <p className="text-sm text-[#525252] dark:text-gray-400 mt-8 text-center">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        )}
      </div>
    </div>
  );
}
