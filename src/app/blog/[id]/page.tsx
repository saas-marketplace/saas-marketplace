import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Share2 } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BlogPostPage({ params }: Props) {
  const { id } = await params;
  
  const supabase = createServerSupabaseClient();
  
  const { data: blog, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !blog) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Link */}
        <Link href="/blog">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        {/* Blog Header */}
        <header className="mb-12">
          {/* Featured Image */}
          {blog.image_url && (
            <div className="mb-8 rounded-2xl overflow-hidden">
              <Image
                src={blog.image_url}
                alt={blog.title}
                width={800}
                height={400}
                className="w-full h-[400px] object-cover"
                priority
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {blog.title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center gap-6 text-muted-foreground">
            {blog.author && (
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {blog.author}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(blog.created_at)}
            </span>
            <button className="flex items-center gap-2 hover:text-primary transition">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </header>

        {/* Blog Content */}
        <article className="prose prose-lg max-w-none">
          {blog.description && (
            <p className="text-xl text-muted-foreground mb-8 lead">
              {blog.description}
            </p>
          )}
          {blog.content ? (
            <div className="whitespace-pre-wrap leading-relaxed">
              {blog.content}
            </div>
          ) : (
            <p className="text-muted-foreground">No content available.</p>
          )}
        </article>

        {/* Blog Footer */}
        <footer className="mt-16 pt-8 border-t">
          <Link href="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View All Posts
            </Button>
          </Link>
        </footer>
      </div>
    </div>
  );
}
