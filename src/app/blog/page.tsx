"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { Loader2, Calendar, User, ArrowRight, FileText, ImageIcon } from "lucide-react";

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

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlogs() {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBlogs(data);
      }
      setLoading(false);
    }

    fetchBlogs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Our <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Insights, tips, and stories from the freelancing world
          </p>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No blog posts yet.</p>
            <p className="text-sm">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {blogs.map((blog, index) => {
              const gradient = gradients[index % gradients.length];
              
              return (
                <Link key={blog.id} href={`/blog/${blog.id}`}>
                  <article className="rounded-xl border bg-card p-0 hover:shadow-lg transition-all h-full flex flex-col overflow-hidden group">
                    {/* Image */}
                    {blog.image_url ? (
                      <div className="h-48 overflow-hidden">
                        <Image
                          src={blog.image_url}
                          alt={blog.title}
                          width={400}
                          height={192}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className={`h-48 bg-gradient-to-br ${gradient}`} />
                    )}

                    <div className="p-6 flex flex-col flex-grow">
                      {/* Meta */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {blog.author && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {blog.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(blog.created_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {blog.title}
                      </h2>

                      {/* Description */}
                      {blog.description && (
                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-grow">
                          {blog.description}
                        </p>
                      )}

                      {/* Read more */}
                      <div className="flex items-center gap-2 text-primary font-medium mt-auto">
                        <span>Read more</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {blogs.length > 0 && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground">More articles coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
