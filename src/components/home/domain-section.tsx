"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { getIconComponent } from '@/components/ui/icon-selector';

interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  freelancer_count: number;
}

const domainGradients: Record<string, string> = {
  "web-development": "from-blue-500 to-cyan-500",
  "mobile-development": "from-purple-500 to-pink-500",
  "design": "from-pink-500 to-rose-500",
  "marketing": "from-orange-500 to-amber-500",
  "copywriting": "from-green-500 to-emerald-500",
  "default": "from-violet-500 to-purple-500",
};

export function DomainSection() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
  }, []);

  async function fetchDomains() {
    const supabase = createClient();
    const { data } = await supabase
      .from("domains")
      .select("*")
      .order('name', { ascending: true });
    
    if (data) {
      setDomains(data);
    }
    setLoading(false);
  }

  if (loading) {
    return null;
  }

  if (domains.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Browse by <span className="gradient-text">Service Domain</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect expert for your project. Our freelancers specialize in various domains.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {domains.map((domain, index) => {
            const Icon = getIconComponent(domain.icon);
            const gradient = domainGradients[domain.slug] || domainGradients.default;

            return (
              <ScrollReveal key={domain.id} delay={index * 0.1}>
                <Link href={`/freelancers/${domain.slug}`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group h-full"
                  >
                    <div className="h-full p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 flex flex-col">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {domain.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {domain.description || `Find ${domain.name} experts`}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-primary">
                          {domain.freelancer_count || 0} freelancers
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link href="/freelancers">
            <Button variant="outline" size="lg" className="gap-2">
              View All Freelancers
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
