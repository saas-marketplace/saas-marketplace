"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Briefcase, User, Globe, Sparkles, Folder, X, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FreelancerData {
  name: string;
  title?: string;
  domain?: string | null;
  domain_id?: string | null;
  skills?: string[] | null;
  experience_level?: string | null;
  description?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  projects_count?: number | null;
  avatar_url?: string | null;
}

interface FreelancerMiniCardProps {
  freelancer: FreelancerData;
  compact?: boolean;
  onViewProfile?: () => void;
  fallbackDomain?: string | null;
  showExpand?: boolean;
  dashboardMode?: boolean;
}

export function FreelancerMiniCard({ freelancer, compact = false, onViewProfile, fallbackDomain, showExpand = true, dashboardMode = false }: FreelancerMiniCardProps) {
  const [showFullModal, setShowFullModal] = useState(false);
  
  const { 
    name, 
    title, 
    domain: freelancerDomain, 
    skills, 
    experience_level, 
    description, 
    rating = 0, 
    reviews_count = 0, 
    projects_count = 0,
    avatar_url 
  } = freelancer;
  // Resolve domain name — never show a raw UUID.
  // page.tsx injects the name into freelancer_data.domain before passing it here,
  // but we also check fallbackDomain (freelancer_domain column) as a safety net.
  const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
  const cleanName = (v: string | null | undefined): string | null => {
    if (typeof v !== 'string' || v.trim() === '') return null;
    if (isUUID(v)) return null; // never show a UUID as a domain name
    return v.trim();
  };
  const displayDomain = cleanName(freelancerDomain) || cleanName(fallbackDomain) || null;

  console.log('[FreelancerMiniCard]', name, '| domain:', freelancerDomain, '| fallback:', fallbackDomain, '| result:', displayDomain ?? 'null');
  const safeRating = typeof rating === 'number' ? rating : 0;
  const safeReviewsCount = typeof reviews_count === 'number' ? reviews_count : 0;
  const safeProjectsCount = typeof projects_count === 'number' ? projects_count : 0;

  const renderStars = (ratingValue: number, size: string = "w-3 h-3 sm:w-4 sm:h-4") => {
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className={`${size} fill-yellow-400 text-yellow-400`} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className={`${size} fill-yellow-400 text-yellow-400`} style={{ clipPath: 'inset(0 50% 0 0)' }} />);
      } else {
        stars.push(<Star key={i} className={`${size} text-gray-300`} />);
      }
    }
    return stars;
  };

  // Compact inline version - treated as part of conversation (no z-index, no dialog)
  if (compact) {
    const cardBaseClass = dashboardMode 
      ? "bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100 shadow-sm"
      : "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-cyan-100 dark:border-gray-700 shadow-sm";
    const textBaseClass = dashboardMode ? "text-slate-900" : "text-slate-900 dark:text-white";
    const subTextBaseClass = dashboardMode ? "text-slate-700" : "text-slate-700 dark:text-gray-300";
    const badgeClass = dashboardMode
      ? "bg-white border-cyan-200 text-cyan-700"
      : "bg-white dark:bg-gray-800 border-cyan-200 dark:border-gray-600 text-cyan-700 dark:text-cyan-300";
    const modalClass = dashboardMode
      ? "bg-gradient-to-br from-cyan-50 via-white to-blue-50 border border-cyan-100"
      : "bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border border-cyan-100 dark:border-gray-700";

    return (
      <>
        {/* Inline mini card - no z-index, no dialog */}
        <div className={`mx-6 my-2 p-3 sm:p-4 ${cardBaseClass}`}>
          {/* Header: Avatar + Name + Title */}
          <div className="flex items-start gap-3 mb-2 sm:mb-3">
            {avatar_url ? (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 border border-purple-200">
                <Image 
                  src={avatar_url} 
                  alt={name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${textBaseClass} truncate`}>{name}</p>
              {title && (
                <p className={`text-xs font-medium truncate ${dashboardMode ? "text-purple-600" : "text-purple-600 dark:text-purple-400"}`}>{title}</p>
              )}
            </div>
            {/* Expand button */}
            {showExpand && (
              <button
                onClick={() => setShowFullModal(true)}
                className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${dashboardMode
                  ? "bg-white border-cyan-200 text-cyan-600 hover:bg-cyan-50"
                  : "bg-white dark:bg-gray-800 border-cyan-200 dark:border-gray-600 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-gray-700"}`}
                title="View Full Details"
              >
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          
          {/* Domain - shown under Specialization (title) */}
          {displayDomain && (
            <div className="flex items-center gap-2 mb-2">
              <Globe className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dashboardMode ? "text-[#249fd3]" : "text-[#249fd3] dark:text-cyan-400"} shrink-0`} />
              <span className={`text-xs font-medium ${subTextBaseClass}`}>{displayDomain}</span>
            </div>
          )}

          {/* Rating & Reviews */}
          {safeRating > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex">{renderStars(safeRating, "w-3 h-3")}</div>
              <span className={`text-xs font-semibold ${textBaseClass}`}>{safeRating.toFixed(1)}</span>
              <span className={`text-xs ${dashboardMode ? "text-slate-400" : "text-slate-400 dark:text-gray-500"}`}>({safeReviewsCount})</span>
            </div>
          )}

          {/* Skills */}
          {skills && skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className={`text-[10px] py-0.5 px-1.5 h-5 sm:h-6 ${badgeClass}`}>
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="secondary" className={`text-[10px] py-0.5 px-1.5 h-5 sm:h-6 font-medium ${badgeClass}`}>+{skills.length - 3}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Full popup modal - only rendered when needed */}
        {showFullModal && (
          <div 
            className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            onClick={() => setShowFullModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative ${modalClass} rounded-xl p-5 shadow-lg max-h-[90vh] overflow-y-auto w-full sm:max-w-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowFullModal(false)}
                className={`absolute top-3 right-3 p-2 rounded-full border shadow-md transition-all duration-200 z-10 ${dashboardMode
                  ? "bg-white/90 border-cyan-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600"
                  : "bg-white/90 dark:bg-gray-800/90 border-cyan-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-gray-700 hover:text-cyan-600 dark:hover:text-cyan-400"}`}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Full card content */}
              <div className="flex items-start gap-4 mb-4">
                {avatar_url ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-200">
                    <Image 
                      src={avatar_url} 
                      alt={name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shrink-0 shadow-lg">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-lg ${textBaseClass}`}>{name}</h3>
                    {experience_level && (
                      <Badge variant="outline" className={`text-xs border-cyan-300 font-medium ${badgeClass}`}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        {experience_level}
                      </Badge>
                    )}
                  </div>
                  {title && (
                    <p className={`text-sm font-semibold mt-0.5 ${dashboardMode ? "text-purple-600" : "text-purple-600 dark:text-purple-400"}`}>{title}</p>
                  )}
                </div>
              </div>

              <div className={`mb-4 p-3 rounded-lg space-y-2 ${dashboardMode ? "bg-white/60" : "bg-white/60 dark:bg-gray-800/50"}`}>
                {title && (
                  <div className="flex items-center gap-2">
                    <Briefcase className={`w-4 h-4 ${dashboardMode ? "text-purple-500" : "text-purple-500 dark:text-purple-400"}`} />
                    <span className={`text-sm font-medium ${subTextBaseClass}`}>Specialization: <span className={textBaseClass}>{title}</span></span>
                  </div>
                )}
                {displayDomain && (
                  <div className="flex items-center gap-2">
                    <Globe className={`w-4 h-4 ${dashboardMode ? "text-[#249fd3]" : "text-[#249fd3] dark:text-cyan-400"}`} />
                    <span className={`text-sm font-medium ${subTextBaseClass}`}>Domain: <span className={textBaseClass}>{displayDomain}</span></span>
                  </div>
                )}
                {safeProjectsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 ${dashboardMode ? "text-green-500" : "text-green-500 dark:text-green-400"}`} />
                    <span className={`text-sm ${dashboardMode ? "text-slate-600" : "text-slate-600 dark:text-gray-400"}`}>{safeProjectsCount} projects completed</span>
                  </div>
                )}
              </div>

              {safeRating > 0 && (
                <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${dashboardMode ? "border-cyan-100" : "border-cyan-100 dark:border-gray-700"}`}>
                  <div className="flex gap-0.5">{renderStars(safeRating, "w-4 h-4")}</div>
                  <span className={`font-bold text-lg ${textBaseClass}`}>{safeRating.toFixed(1)}</span>
                  <span className={`text-sm ${dashboardMode ? "text-slate-500" : "text-slate-500 dark:text-gray-400"}`}>({safeReviewsCount} reviews)</span>
                </div>
              )}

              {skills && skills.length > 0 && (
                <div className="mb-4">
                  <p className={`text-xs font-semibold mb-2 uppercase tracking-wider ${dashboardMode ? "text-slate-500" : "text-slate-500 dark:text-gray-400"}`}>Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 6).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className={`text-xs px-3 py-1 font-medium ${badgeClass}`}>
                        {skill}
                      </Badge>
                    ))}
                    {skills.length > 6 && (
                      <Badge variant="secondary" className={`text-xs px-3 py-1 font-medium ${badgeClass}`}>+{skills.length - 6} more</Badge>
                    )}
                  </div>
                </div>
              )}

              {description && (
                <div className="mb-4">
                  <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${dashboardMode ? "text-slate-500" : "text-slate-500 dark:text-gray-400"}`}>About</p>
                  <p className={`text-sm leading-relaxed ${dashboardMode ? "text-slate-600" : "text-slate-600 dark:text-gray-300"}`}>{description}</p>
                </div>
              )}

              {onViewProfile && (
                <div className={`flex gap-2 pt-3 border-t ${dashboardMode ? "border-cyan-100" : "border-cyan-100 dark:border-gray-700"}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setShowFullModal(false); onViewProfile(); }}
                    className={`flex-1 border font-medium ${dashboardMode
                      ? "border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300"
                      : "border-cyan-200 dark:border-gray-600 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-gray-700 hover:border-cyan-300"}`}
                  >
                    View Full Profile
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </>
    );
  }

  // Full version for message view - with expand button
  const cardBaseClass = dashboardMode 
    ? "bg-gradient-to-br from-cyan-50 via-white to-blue-50 rounded-xl border border-cyan-100 shadow-lg"
    : "bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl border border-cyan-100 dark:border-gray-700 shadow-lg";
  const textBaseClass = dashboardMode ? "text-slate-900" : "text-slate-900 dark:text-white";
  const subTextBaseClass = dashboardMode ? "text-slate-700" : "text-slate-700 dark:text-gray-300";
  const subSubTextClass = dashboardMode ? "text-slate-600" : "text-slate-600 dark:text-gray-400";
  const labelTextClass = dashboardMode ? "text-slate-500" : "text-slate-500 dark:text-gray-400";
  const badgeClass = dashboardMode
    ? "bg-white border-cyan-200 text-cyan-700"
    : "bg-white dark:bg-gray-800 border-cyan-200 dark:border-gray-600 text-cyan-700 dark:text-cyan-300";
  const modalClass = dashboardMode
    ? "bg-gradient-to-br from-cyan-50 via-white to-blue-50 border border-cyan-100"
    : "bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border border-cyan-100 dark:border-gray-700";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${cardBaseClass} p-5 shadow-lg relative group`}
      >
        <button
          onClick={() => setShowFullModal(true)}
          className={`absolute top-3 right-3 p-2 rounded-lg border transition-opacity duration-200 hover:border-cyan-300 ${dashboardMode
            ? "bg-white/80 border-cyan-200 text-cyan-600 opacity-0 group-hover:opacity-100 hover:bg-cyan-50"
            : "bg-white/80 dark:bg-gray-800/80 border-cyan-200 dark:border-gray-600 text-cyan-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 hover:bg-cyan-50 dark:hover:bg-gray-700"}`}
          title="View Full Details"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          {avatar_url ? (
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-200 shadow-lg">
              <Image 
                src={avatar_url} 
                alt={name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shrink-0 shadow-lg">
              <User className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-bold text-lg ${textBaseClass}`}>{name}</h3>
              {experience_level && (
                <Badge variant="outline" className={`text-xs border-cyan-300 font-medium ${badgeClass}`}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  {experience_level}
                </Badge>
              )}
            </div>
            {title && (
              <p className={`text-sm font-semibold mt-0.5 ${dashboardMode ? "text-purple-600" : "text-purple-600 dark:text-purple-400"}`}>{title}</p>
            )}
          </div>
        </div>

        <div className={`mb-4 p-3 rounded-lg space-y-2 ${dashboardMode ? "bg-white/60" : "bg-white/60 dark:bg-gray-800/50"}`}>
          {title && (
            <div className="flex items-center gap-2">
              <Briefcase className={`w-4 h-4 ${dashboardMode ? "text-purple-500" : "text-purple-500 dark:text-purple-400"}`} />
              <span className={`text-sm font-medium ${subTextBaseClass}`}>Specialization: <span className={textBaseClass}>{title}</span></span>
            </div>
          )}
          {displayDomain && (
            <div className="flex items-center gap-2">
              <Globe className={`w-4 h-4 ${dashboardMode ? "text-[#249fd3]" : "text-[#249fd3] dark:text-cyan-400"}`} />
              <span className={`text-sm font-medium ${subTextBaseClass}`}>Domain: <span className={textBaseClass}>{displayDomain}</span></span>
            </div>
          )}
          {safeProjectsCount > 0 && (
            <div className="flex items-center gap-2">
              <Folder className={`w-4 h-4 ${dashboardMode ? "text-green-500" : "text-green-500 dark:text-green-400"}`} />
              <span className={`text-sm ${subSubTextClass}`}>{safeProjectsCount} projects completed</span>
            </div>
          )}
        </div>

        {safeRating > 0 && (
          <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${dashboardMode ? "border-cyan-100" : "border-cyan-100 dark:border-gray-700"}`}>
            <div className="flex gap-0.5">{renderStars(safeRating, "w-4 h-4")}</div>
            <span className={`font-bold text-lg ${textBaseClass}`}>{safeRating.toFixed(1)}</span>
            <span className={`text-sm ${labelTextClass}`}>({safeReviewsCount} reviews)</span>
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="mb-4">
            <p className={`text-xs font-semibold mb-2 uppercase tracking-wider ${labelTextClass}`}>Skills</p>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 6).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className={`text-xs px-3 py-1 font-medium ${badgeClass}`}>
                  {skill}
                </Badge>
              ))}
              {skills.length > 6 && (
                <Badge variant="outline" className={`text-xs px-3 py-1 ${dashboardMode ? "" : "dark:text-gray-300"}`}>+{skills.length - 6} more</Badge>
              )}
            </div>
          </div>
        )}

        {description && (
          <div className="mb-4">
            <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${labelTextClass}`}>About</p>
            <p className={`text-sm leading-relaxed ${subSubTextClass}`}>{description}</p>
          </div>
        )}

        {onViewProfile && (
          <div className={`flex gap-2 pt-3 border-t ${dashboardMode ? "border-cyan-100" : "border-cyan-100 dark:border-gray-700"}`}>
            <Button variant="outline" size="sm" onClick={onViewProfile} className={`flex-1 border font-medium ${dashboardMode
              ? "border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300"
              : "border-cyan-200 dark:border-gray-600 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-gray-700 hover:border-cyan-300"}`}>
              View Full Profile
            </Button>
          </div>
        )}
      </motion.div>

      {/* Full popup modal */}
      {showFullModal && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          onClick={() => setShowFullModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative ${modalClass} rounded-xl p-5 shadow-lg max-h-[90vh] overflow-y-auto w-full sm:max-w-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFullModal(false)}
              className={`absolute top-3 right-3 p-2 rounded-full border shadow-md transition-all duration-200 z-10 ${dashboardMode
                ? "bg-white/90 border-cyan-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600"
                : "bg-white/90 dark:bg-gray-800/90 border-cyan-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-gray-700 hover:text-cyan-600 dark:hover:text-cyan-400"}`}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4 mb-4">
              {avatar_url ? (
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-200 shadow-lg">
                  <Image 
                    src={avatar_url} 
                    alt={name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#249fd3] to-cyan-400 flex items-center justify-center shrink-0 shadow-lg">
                  <User className="w-7 h-7 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-bold text-lg ${textBaseClass}`}>{name}</h3>
                  {experience_level && (
                    <Badge variant="outline" className={`text-xs border-cyan-300 font-medium ${badgeClass}`}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      {experience_level}
                    </Badge>
                  )}
                </div>
                {title && (
                  <p className={`text-sm font-semibold mt-0.5 ${dashboardMode ? "text-purple-600" : "text-purple-600 dark:text-purple-400"}`}>{title}</p>
                )}
              </div>
            </div>
            <div className={`mb-4 p-3 rounded-lg space-y-2 ${dashboardMode ? "bg-white/60" : "bg-white/60 dark:bg-gray-800/50"}`}>
              {title && (
                <div className="flex items-center gap-2">
                  <Briefcase className={`w-4 h-4 ${dashboardMode ? "text-purple-500" : "text-purple-500 dark:text-purple-400"}`} />
                  <span className={`text-sm font-medium ${subTextBaseClass}`}>Specialization: <span className={textBaseClass}>{title}</span></span>
                </div>
              )}
              {displayDomain && (
                <div className="flex items-center gap-2">
                  <Globe className={`w-4 h-4 ${dashboardMode ? "text-[#249fd3]" : "text-[#249fd3] dark:text-cyan-400"}`} />
                  <span className={`text-sm font-medium ${subTextBaseClass}`}>Domain: <span className={textBaseClass}>{displayDomain}</span></span>
                </div>
              )}
              {safeProjectsCount > 0 && (
                <div className="flex items-center gap-2">
                  <Folder className={`w-4 h-4 ${dashboardMode ? "text-green-500" : "text-green-500 dark:text-green-400"}`} />
                  <span className={`text-sm ${subSubTextClass}`}>{safeProjectsCount} projects completed</span>
                </div>
              )}
            </div>
            {safeRating > 0 && (
              <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${dashboardMode ? "border-cyan-100" : "border-cyan-100 dark:border-gray-700"}`}>
                <div className="flex gap-0.5">{renderStars(safeRating, "w-4 h-4")}</div>
                <span className={`font-bold text-lg ${textBaseClass}`}>{safeRating.toFixed(1)}</span>
                <span className={`text-sm ${labelTextClass}`}>({safeReviewsCount} reviews)</span>
              </div>
            )}
            {skills && skills.length > 0 && (
              <div className="mb-4">
                <p className={`text-xs font-semibold mb-2 uppercase tracking-wider ${labelTextClass}`}>Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.slice(0, 6).map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className={`text-xs px-3 py-1 font-medium ${badgeClass}`}>
                      {skill}
                    </Badge>
                  ))}
                  {skills.length > 6 && (
                    <Badge variant="outline" className={`text-xs px-3 py-1 ${dashboardMode ? "" : "dark:text-gray-300"}`}>+{skills.length - 6} more</Badge>
                  )}
                </div>
              </div>
            )}
            {description && (
              <div className="mb-4">
                <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${labelTextClass}`}>About</p>
                <p className={`text-sm leading-relaxed ${subSubTextClass}`}>{description}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}

export default FreelancerMiniCard;