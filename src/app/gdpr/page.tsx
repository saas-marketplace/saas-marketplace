"use client";

export default function GDPRPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">GDPR Compliance</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Data Rights</h2>
              <p>
                Under GDPR, you have specific rights regarding your personal data, 
                including the right to access, correct, delete, and restrict processing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Data We Collect</h2>
              <p>
                We collect information you provide to us, including name, email, 
                and profile information. We also collect usage data to improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
              <p>
                To exercise your GDPR rights or ask questions about how we process 
                your data, please contact us.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
