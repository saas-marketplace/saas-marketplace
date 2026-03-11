"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { StarRating } from "@/components/ui/star-rating";
import { createClient } from "@/lib/supabase/client";
import type { Freelancer, Domain } from "@/types";

export default function DomainFreelancersPage() {
  const params = useParams();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Get domain
    const { data: domainData } = await supabase
      .from("domains")
      .select("*")
      .eq("slug", params.slug)
      .single();

    if (domainData) {
      setDomain(domainData);

      // Get freelancers in this domain
      const { data: freelancerData } = await supabase
        .from("freelancers")
        .select("*")
        .eq("domain_id", domainData.id)
        .order("rating", { ascending: false });

      if (freelancerData) setFreelancers(freelancerData);
    }
    setLoading(false);
  }, [supabase, params.slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/freelancers"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All Domains
        </Link>

        {domain && (
          <ScrollReveal className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              {domain.name}{" "}
              <span className="gradient-text">Freelancers</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {domain.description}
            </p>
          </ScrollReveal>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl glass-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freelancers.map((freelancer, index) => (
              <ScrollReveal key={freelancer.id} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -8 }}
                  className="glass-card rounded-2xl p-6 group"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {freelancer.display_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {freelancer.display_name}
                        </h3>
                        {freelancer.is_available && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-primary font-medium truncate">
                        {freelancer.title}
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <StarRating rating={freelancer.rating} size="sm" />
                    <span className="text-sm font-medium">
                      {freelancer.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({freelancer.review_count} reviews)
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {freelancer.bio}
                  </p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {freelancer.skills.slice(0, 4).map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {freelancer.skills.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{freelancer.skills.length - 4}
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    {freelancer.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {freelancer.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {freelancer.completed_projects} projects
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    {freelancer.hourly_rate && (
                      <span className="flex items-center gap-1 font-semibold">
                        <DollarSign className="w-4 h-4 text-primary" />
                        {freelancer.hourly_rate}/hr
                      </span>
                    )}
                    <Link
                      href={`/freelancers/profile/${freelancer.id}`}
                    >
                      <Button
                        size="sm"
                        className="gradient-bg text-white border-0 hover:opacity-90 rounded-full"
                      >
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}