"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
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

      if (freelancerData && freelancerData.length > 0) {
        // Try to fetch reviews from new reviews table
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("freelancer_id, rating");

        if (reviewData && reviewData.length > 0) {
          // Calculate ratings for each freelancer
          const freelancerIds = (freelancerData as any[]).map(f => f.id);
          const reviewsByFreelancer = (reviewData as any[]).filter(r => 
            freelancerIds.includes(r.freelancer_id)
          );
          
          (freelancerData as any[]).forEach(freelancer => {
            const freelancerReviews = reviewsByFreelancer.filter(
              r => r.freelancer_id === freelancer.id
            );
            if (freelancerReviews.length > 0) {
              const totalRating = freelancerReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
              freelancer.rating = totalRating / freelancerReviews.length;
              freelancer.review_count = freelancerReviews.length;
            } else {
              freelancer.rating = 0;
              freelancer.review_count = 0;
            }
          });
        }
        
        setFreelancers(freelancerData);
      } else {
        setFreelancers([]);
      }
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
                  className="glass-card rounded-2xl p-5 group relative h-[320px] flex flex-col"
                >
                  {/* Experience Level Badge - Top Right */}
                  {freelancer.experience_level && (
                    <span className="absolute bottom-3 left-3 bg-white text-black border border-gray-200 rounded-full px-3 py-1 text-xs font-medium shadow-sm translate-y-[-10px] ">
                      {freelancer.experience_level}
                    </span>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
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
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={freelancer.rating} size="sm" />
                    <span className="text-sm font-medium">
                      {freelancer.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({freelancer.review_count})
                    </span>
                  </div>

                  {/* Location and Projects - Moved up */}
                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    {freelancer.location && (
                      <span className="flex items-center gap-1 truncate max-w-[80px]">
                        <MapPin className="w-3 h-3" />
                        {freelancer.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {freelancer.completed_projects}
                    </span>
                  </div>

                  {/* Bio - 2 lines max */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {freelancer.bio}
                  </p>

                  {/* Description - 2 lines max */}
                  {freelancer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {freelancer.description}
                    </p>
                  )}

                  {/* Skills - max 3 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {freelancer.skills.slice(0, 3).map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {freelancer.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{freelancer.skills.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end mt-auto pt-3 border-t border-border/50">
                    <Link
                      href={`/freelancers/profile/${freelancer.id}`}
                    >
                      <Button
                        size="sm"
                        className="gradient-bg text-white border-0 hover:opacity-90 rounded-full text-s px-6 py-2"
                      >
                        View
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