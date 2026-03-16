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
      className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold">
            {freelancer.display_name?.charAt(0).toUpperCase() || "F"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate text-[#0A0A0A] dark:text-white">
              {freelancer.display_name}
            </h3>
            <p className="text-[#525252] dark:text-gray-400 text-sm truncate">
              {freelancer.title || freelancer.bio?.slice(0, 50) || "Freelancer"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {freelancer.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{freelancer.rating.toFixed(1)}</span>
                  <span className="text-[#737373] dark:text-gray-500 text-xs">
                    ({freelancer.review_count})
                  </span>
                </div>
              )}
              {freelancer.location && (
                <div className="flex items-center gap-1 text-[#737373] dark:text-gray-500">
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
          <div className="flex items-center gap-4 text-sm text-[#525252] dark:text-gray-400">
            {freelancer.completed_projects > 0 && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                <span>{freelancer.completed_projects} projects</span>
              </div>
            )}
            {freelancer.experience_level && (
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                {freelancer.experience_level}
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
