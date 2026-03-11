"use client";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard 
                your information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
              <p>
                We collect information you provide directly to us, including your name, 
                email address, and profile information when you create an account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our 
                services, to communicate with you, and to protect our rights and the 
                rights of other users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
