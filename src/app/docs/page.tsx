"use client";

export default function DocsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Documentation</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Learn how to use our platform effectively
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <section className="border rounded-xl p-6 bg-card">
            <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
            <p className="text-muted-foreground">
              Welcome to our platform! This guide will help you get started with
              finding freelancers and managing your projects.
            </p>
          </section>

          <section className="border rounded-xl p-6 bg-card">
            <h2 className="text-2xl font-bold mb-4">For Freelancers</h2>
            <p className="text-muted-foreground">
              Learn how to create your profile, showcase your skills, and find clients.
            </p>
          </section>

          <section className="border rounded-xl p-6 bg-card">
            <h2 className="text-2xl font-bold mb-4">For Businesses</h2>
            <p className="text-muted-foreground">
              Discover how to post projects, hire talent, and manage your team.
            </p>
          </section>

          <section className="border rounded-xl p-6 bg-card">
            <h2 className="text-2xl font-bold mb-4">API Reference</h2>
            <p className="text-muted-foreground">
              Technical documentation for developers integrating with our platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
