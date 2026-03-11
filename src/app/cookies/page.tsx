"use client";

export default function CookiesPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">What Are Cookies</h2>
              <p>
                Cookies are small text files that are stored on your device when you 
                visit our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Cookies</h2>
              <p>
                We use cookies to understand how you use our platform, to remember your 
                preferences, and to improve your experience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Managing Cookies</h2>
              <p>
                You can control or delete cookies through your browser settings. 
                However, some features of our platform may not function properly 
                without cookies.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
