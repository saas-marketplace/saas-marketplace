"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { getIconComponent } from '@/components/ui/icon-selector';
import { ArrowRight } from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  freelancer_count: number;
}

// Color palette for cycling through domains - each new domain gets a different color
const colorPalette = [
  { from: "from-blue-500", to: "to-cyan-500" },
  { from: "from-purple-500", to: "to-pink-500" },
  { from: "from-pink-500", to: "to-rose-500" },
  { from: "from-orange-500", to: "to-amber-500" },
  { from: "from-green-500", to: "to-emerald-500" },
  { from: "from-cyan-500", to: "to-cyan-400" },
  { from: "from-violet-500", to: "to-purple-500" },
  { from: "from-rose-500", to: "to-red-500" },
  { from: "from-teal-500", to: "to-green-500" },
  { from: "from-indigo-500", to: "to-violet-500" },
];

// Function to get color based on domain index (cycles through palette)
function getDomainColor(index: number) {
  const colorIndex = index % colorPalette.length;
  return `${colorPalette[colorIndex].from} ${colorPalette[colorIndex].to}`;
}

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
    
    if (data) setDomains(data);
    setLoading(false);
  }

  if (loading) return null;
  if (domains.length === 0) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Browse by <span className="gradient-text">Service Domain</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect expert for your project. Our freelancers specialize in various domains.
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {domains.map((domain, index) => {
            const Icon = getIconComponent(domain.icon);
            const gradient = getDomainColor(index);

            return (
              <ScrollReveal key={domain.id} delay={index * 0.1}>
                <Link href={`/freelancers/${domain.slug}`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group h-full"
                  >
                    <div className="h-full p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 flex flex-col">
                      
                      {/* ICON */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* TITLE */}
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {domain.name}
                      </h3>

                      {/* DESCRIPTION (with ellipsis) */}
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {domain.description || `Find ${domain.name} experts`}
                      </p>

                      {/* FOOTER: FREELANCER COUNT */}
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {domain.freelancer_count || 0} freelancers
                        </span>
                        <div className="w-8 h-8 rounded-full bg-transparent border-2 border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                      </div>

                    </div>
                  </motion.div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>

        {/* VIEW ALL */}
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