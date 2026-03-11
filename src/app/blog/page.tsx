"use client";

import Link from "next/link";

export default function BlogPage() {
  const posts = [
    {
      title: "10 Tips for Freelancers to Land Their First Client",
      excerpt: "Starting your freelancing journey? Here are our top tips for getting your first clients.",
      date: "March 10, 2024",
      category: "Freelancing",
    },
    {
      title: "How to Price Your Freelance Services",
      excerpt: "Finding the right price point is crucial. Learn how to value your work appropriately.",
      date: "March 5, 2024",
      category: "Business",
    },
    {
      title: "The Future of Remote Work in 2024",
      excerpt: "Explore the latest trends shaping the remote work landscape this year.",
      date: "February 28, 2024",
      category: "Trends",
    },
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {posts.map((post) => (
            <article key={post.title} className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
              <div className="text-sm text-primary mb-2">{post.category}</div>
              <h2 className="text-xl font-bold mb-2">{post.title}</h2>
              <p className="text-muted-foreground mb-4">{post.excerpt}</p>
              <div className="text-sm text-muted-foreground">{post.date}</div>
            </article>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">More articles coming soon!</p>
        </div>
      </div>
    </div>
  );
}
