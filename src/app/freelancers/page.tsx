"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { createClient } from "@/lib/supabase/client";
import type { Domain } from "@/types";
import { getIconComponent } from "@/components/ui/icon-selector";

const domainGradients: Record<string, string> = {
  "web-development": "from-blue-500 to-cyan-500",
  "graphic-design": "from-pink-500 to-purple-500",
  "video-editing": "from-red-500 to-orange-500",
  marketing: "from-green-500 to-emerald-500",
  copywriting: "from-yellow-500 to-amber-500",
};

export default function FreelancersPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDomains();
  }, []);

  async function fetchDomains() {
    const { data } = await supabase
      .from("domains")
      .select("*")
      .order("name");

    if (data) setDomains(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="relative pb-16">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Freelancer Hub
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Find World-Class{" "}
              <span className="gradient-text">Freelance Talent</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse our curated network of vetted professionals across
              multiple domains. Find the perfect expert for your project.
            </p>
          </ScrollReveal>

          {/* Domain Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl glass-card animate-pulse"
                  />
                ))
              : domains.map((domain, index) => {
                  const Icon = getIconComponent(domain.icon);
                  const gradient =
                    domainGradients[domain.slug] || "from-gray-500 to-gray-700";

                  return (
                    <ScrollReveal key={domain.id} delay={index * 0.1}>
                      <Link href={`/freelancers/${domain.slug}`}>
                        <motion.div
                          whileHover={{ y: -8, scale: 1.02 }}
                          className="glass-card rounded-2xl p-8 cursor-pointer group h-full"
                        >
                          <div
                            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                          >
                            <Icon className="w-8 h-8 text-white" />
                          </div>

                          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                            {domain.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            {domain.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              {domain.freelancer_count} freelancers
                            </span>
                            <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                        </motion.div>
                      </Link>
                    </ScrollReveal>
                  );
                })}
          </div>
        </div>
      </section>
    </div>
  );
}