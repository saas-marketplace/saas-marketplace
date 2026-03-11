"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Acceptance of Terms</h2>
              <p>
                By accessing and using our platform, you accept and agree to be bound 
                by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Use License</h2>
              <p>
                Permission is granted to temporarily use our platform for personal, 
                non-commercial use only.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">User Conduct</h2>
              <p>
                You agree not to use the platform in any way that violates any applicable 
                laws or regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimer</h2>
              <p>
                The platform is provided "as is" without warranty of any kind.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
