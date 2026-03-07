"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

const blogPosts = [
  {
    title: "The Future of Remote Work in 2024",
    excerpt:
      "Explore the latest trends shaping remote work and how freelancers can stay ahead of the curve.",
    slug: "future-of-remote-work-2024",
    author: "Alex Rivera",
    category: "Industry",
    read_time: 8,
    published_at: "2024-01-15",
    gradient: "from-purple-500 to-blue-500",
  },
  {
    title: "10 Essential Tools Every Designer Needs",
    excerpt:
      "A curated list of must-have design tools for modern digital designers who want to stay productive.",
    slug: "10-essential-designer-tools",
    author: "Sophie Laurent",
    category: "Design",
    read_time: 6,
    published_at: "2024-01-10",
    gradient: "from-pink-500 to-orange-500",
  },
  {
    title: "How to Build a Profitable SaaS Product",
    excerpt:
      "Step-by-step guide to building, launching, and scaling a successful SaaS product from scratch.",
    slug: "build-profitable-saas",
    author: "James Wilson",
    category: "Development",
    read_time: 12,
    published_at: "2024-01-05",
    gradient: "from-green-500 to-teal-500",
  },
];

export function BlogSection() {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <ScrollReveal key={post.slug} delay={index * 0.15}>
              <motion.article
                whileHover={{ y: -8 }}
                className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
              >
                {/* Image placeholder */}
                <div
                  className={`h-48 bg-gradient-to-br ${post.gradient} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-white/20 text-white backdrop-blur-sm border-0">
                      {post.category}
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(post.published_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.read_time} min read
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{post.author}</span>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}