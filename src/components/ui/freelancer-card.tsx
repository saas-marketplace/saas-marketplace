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
      className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-lg transition-shadow relative h-[320px] flex flex-col"
    >
      {freelancer.experience_level && (
        <span className="absolute top-3 right-3 bg-white text-black border border-gray-200 rounded-full px-3 py-1 text-xs font-medium shadow-sm translate-y-[10px] z-10">
          {freelancer.experience_level}
        </span>
      )}
      <div className="p-5 flex flex-col flex-1 justify-between">
        {/* Top Section */}
        <div>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {freelancer.display_name?.charAt(0).toUpperCase() || "F"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate text-[#0A0A0A] dark:text-white">
                {freelancer.display_name}
              </h3>
              <p className="text-[#525252] dark:text-gray-400 text-sm truncate">
                {freelancer.title || "Freelancer"}
              </p>
              {/* Description - show if available */}
              {freelancer.description && (
                <p className="text-[#737373] dark:text-gray-500 text-xs mt-1 line-clamp-2">
                  {freelancer.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {freelancer.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">{freelancer.rating.toFixed(1)}</span>
                    <span className="text-[#737373] dark:text-gray-500 text-xs">
                      ({freelancer.review_count})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location and Projects - Moved up */}
          <div className="flex items-center gap-3 mt-2 text-xs text-[#737373] dark:text-gray-500">
            {freelancer.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{freelancer.location}</span>
              </div>
            )}
            {freelancer.completed_projects > 0 && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                <span>{freelancer.completed_projects} projects</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Section - Skills */}
        <div className="my-3">
          {freelancer.skills && freelancer.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {freelancer.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {freelancer.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{freelancer.skills.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {freelancer.is_available && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-500 font-medium">Available</span>
              </>
            )}
          </div>
          <Button asChild size="sm" className="text-xs px-3 py-1">
            <Link href={`/freelancers/profile/${freelancer.id}`}>
              View
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
