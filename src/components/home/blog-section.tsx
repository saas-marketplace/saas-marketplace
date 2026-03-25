"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Calendar, Loader2, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

interface Blog {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  author: string | null;
  created_at: string;
}

const gradients = [
  "from-purple-500 to-blue-500",
  "from-pink-500 to-orange-500",
  "from-green-500 to-teal-500",
  "from-amber-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-pink-500",
];

export function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // ✅ FIX: Added retry logic. On first load the singleton Supabase client could
    // be in a temporarily broken state if the auth lock contention (now fixed in
    // auth-provider.tsx) interrupted its internal initialisation. A single silent
    // retry after 800 ms recovers without requiring a hard reload.
    async function fetchBlogs(attempt = 0) {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (cancelled) return;

      if (error) {
        if (attempt < 2) {
          setTimeout(() => fetchBlogs(attempt + 1), 800);
          return;
        }
        // All retries exhausted — show empty state rather than a broken spinner
        setLoading(false);
        return;
      }

      if (data) setBlogs(data);
      setLoading(false);
    }

    fetchBlogs();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  // If no blogs, don't show the section or show a placeholder
  if (blogs.length === 0) {
    return (
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-16">
            <ScrollReveal>
              <Badge variant="secondary" className="mb-4">
                Latest Insights
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                From our <span className="gradient-text">blog</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl">
                Stay updated with the latest trends, tips, and insights from
                industry experts.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <Link href="/blog">
                <Button variant="outline" className="mt-4 sm:mt-0 group">
                  View All Posts
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </ScrollReveal>
          </div>

          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No blog posts yet.</p>
            <p className="text-sm">Check back soon for new content!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-16 m-c3">
          <ScrollReveal>
            <Badge variant="secondary" className="mb-4">
              Latest Insights
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              From our <span className="gradient-text">blog</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Stay updated with the latest trends, tips, and insights from
              industry experts.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <Link href="/blog">
              <Button variant="outline" className="mt-4 sm:mt-0 group">
                View All Posts
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog, index) => {
            const gradient = gradients[index % gradients.length];
            
            return (
              <ScrollReveal key={blog.id} delay={index * 0.15}>
                <Link href={`/blog/${blog.id}`}>
                  <motion.article
                    whileHover={{ y: -8 }}
                    className="glass-card rounded-2xl overflow-hidden group cursor-pointer h-full"
                  >
                    {/* Image */}
                    {blog.image_url ? (
                      <div className="h-48 relative overflow-hidden">
                        <Image
                          src={blog.image_url}
                          alt={blog.title}
                          width={400}
                          height={192}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                    ) : (
                      <div
                        className={`h-48 bg-gradient-to-br ${gradient} relative overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(blog.created_at)}
                        </span>
                        {blog.author && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {blog.author}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      {blog.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                          {blog.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-sm font-medium">Read more</span>
                        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.article>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}