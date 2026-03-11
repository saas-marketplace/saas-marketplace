"use client";

export default function CommunityPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Our <span className="gradient-text">Community</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Join thousands of freelancers and businesses worldwide
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="border rounded-xl p-6 bg-card text-center">
            <h3 className="text-3xl font-bold mb-2">10,000+</h3>
            <p className="text-muted-foreground">Active Freelancers</p>
          </div>
          <div className="border rounded-xl p-6 bg-card text-center">
            <h3 className="text-3xl font-bold mb-2">2,500+</h3>
            <p className="text-muted-foreground">Businesses</p>
          </div>
          <div className="border rounded-xl p-6 bg-card text-center">
            <h3 className="text-3xl font-bold mb-2">50+</h3>
            <p className="text-muted-foreground">Countries</p>
          </div>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">Join Our Discord</h2>
          <p className="text-muted-foreground mb-6">
            Connect with other freelancers, share tips, and get support
          </p>
        </div>
      </div>
    </div>
  );
}
