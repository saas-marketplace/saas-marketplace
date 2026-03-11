"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Freelancer } from "@/types";

interface FreelancerCardProps {
  freelancer: Freelancer;
}

export default function FreelancerCard({ freelancer }: FreelancerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold">
            {freelancer.display_name?.charAt(0).toUpperCase() || "F"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {freelancer.display_name}
            </h3>
            <p className="text-muted-foreground text-sm truncate">
              {freelancer.title || freelancer.bio?.slice(0, 50) || "Freelancer"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {freelancer.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{freelancer.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs">
                    ({freelancer.review_count})
                  </span>
                </div>
              )}
              {freelancer.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs">{freelancer.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {freelancer.skills && freelancer.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {freelancer.skills.slice(0, 4).map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {freelancer.skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{freelancer.skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {freelancer.completed_projects > 0 && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                <span>{freelancer.completed_projects} projects</span>
              </div>
            )}
            {freelancer.hourly_rate && (
              <span className="font-semibold text-foreground">
                ${freelancer.hourly_rate}/hr
              </span>
            )}
          </div>
          <Button asChild size="sm">
            <Link href={`/freelancers/profile/${freelancer.id}`}>
              View Profile
            </Link>
          </Button>
        </div>

        {freelancer.is_available && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-500 font-medium">Available</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
