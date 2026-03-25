"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Briefcase,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  Calendar,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { StarRating } from "@/components/ui/star-rating";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import type { Freelancer, Review } from "@/types";

export default function FreelancerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ subject_type: "project", custom_subject: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchFreelancer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function fetchFreelancer() {
    setLoading(true);
    
    // Fetch freelancer data
    const { data: freelancerData, error: freelancerError } = await supabase
      .from("freelancers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (freelancerError) {
      console.error("Error fetching freelancer:", freelancerError);
      setLoading(false);
      return;
    }

    if (freelancerData) {
      // Try fetching from new reviews table first
      let reviewData: Review[] | null = null;
      let avgRating = freelancerData.rating || 0;
      let reviewCount = freelancerData.review_count || 0;
      
      let { data: newReviews, error: newReviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("freelancer_id", freelancerData.id)
        .order("created_at", { ascending: false });

      if (!newReviewsError && newReviews && newReviews.length > 0) {
        // Fetch user data for each review from public.users table
        const userIds = [...new Set((newReviews as any[]).map((r: any) => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", userIds);
          
          // Merge user data into reviews - use email prefix as fallback for full_name
          newReviews = (newReviews as any[]).map((review: any) => {
            const user = usersData?.find((u: any) => u.id === review.user_id);
            return {
              ...review,
              user: user ? { 
                ...user, 
                // Use full_name if available, otherwise use email prefix, otherwise null
                full_name: user.full_name || (user.email ? user.email.split('@')[0] : null) 
              } : null
            };
          });
        }
        // Use new reviews table
        reviewData = newReviews;
        reviewCount = newReviews.length;
        const totalRating = (newReviews as any[]).reduce((sum, r) => sum + (r.rating || 0), 0);
        avgRating = totalRating / reviewCount;
        console.log("Using reviews table:", reviewCount, "reviews");
      }
      
      // Update freelancer with calculated rating
      freelancerData.rating = avgRating;
      freelancerData.review_count = reviewCount;
      
      setFreelancer(freelancerData);
      setReviews(reviewData || []);
      
      // Check if current user has already reviewed
      const { data: { user } } = await supabase.auth.getUser();
      if (user && reviewData) {
        const existingReview = reviewData.find((r) => r.user_id === user.id);
        setUserReview(existingReview || null);
      }
    }
    setLoading(false);
  }

  async function handleSubmitReview() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave a review.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has already reviewed
    if (userReview) {
      toast({
        title: "Already reviewed",
        description: "You have already reviewed this freelancer. You can only leave one review per freelancer.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    // Try inserting into reviews table
    const { error: insertError } = await supabase.from("reviews").insert({
      freelancer_id: freelancer!.id,
      user_id: user.id,
      rating: newRating,
      comment: newComment,
    });
    
    if (insertError) {
      toast({
        title: "Error",
        description: insertError.message || "Failed to submit review. You may have already reviewed this freelancer.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: "Review submitted!",
      description: "Thank you for your feedback.",
    });
    setNewComment("");
    setNewRating(5);
    
    // ✅ Create notification for freelancer owner when review is added (MATCH TASK FORMAT)
    try {
      // Get reviewer's full name for dynamic message
      const { data: reviewerData } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const reviewerName = reviewerData?.full_name || "A user";
      
      // Get freelancer owner's user_id
      const { data: freelancerData } = await supabase
        .from("freelancers")
        .select("user_id")
        .eq("id", freelancer!.id)
        .single();
      
      if (freelancerData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: freelancerData.user_id,
          type: "review",
          title: "New Review",
          message: `${reviewerName} rated you ${newRating}★`,
          link: `/freelancers/${freelancer!.id}`
        });
      }
    } catch (notifError) {
      // Don't fail the review if notification fails
      console.error("Error creating review notification:", notifError);
    }
    
    // Refresh reviews - the database trigger will automatically update the freelancer rating
    fetchFreelancer();
    setSubmitting(false);
  }

  async function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setContactSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    // Guest protection - redirect to login
    if (!user) {
      router.push("/auth/login?returnUrl=" + encodeURIComponent("/requests"));
      return;
    }

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancer_id: freelancer!.id,
          subject_type: contactForm.subject_type,
          title: contactForm.subject_type === 'custom' ? contactForm.custom_subject : undefined,
          message: contactForm.message,
          request_type: "freelancer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${freelancer!.display_name}.`,
      });
      setContactForm({ subject_type: "project", custom_subject: "", message: "" });
      setContactOpen(false);
      // Redirect to /requests and auto-open the new request chat
      const requestId = data?.request?.id || data?.id;
      router.push(requestId ? `/requests?requestId=${requestId}` : "/requests");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
    setContactSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-32" />
            <div className="flex gap-6">
              <div className="w-32 h-32 bg-muted rounded-2xl" />
              <div className="space-y-3 flex-1">
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Freelancer Not Found</h1>
          <Button onClick={() => router.push("/freelancers")}>
            Browse Freelancers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <ScrollReveal>
          <div className="glass-card rounded-3xl p-8 mb-8 relative">
            {/* Experience Level Badge - Top Right */}
            {freelancer.experience_level && (
              <span className="absolute top-6 right-6 bg-white text-black border border-gray-200 rounded-full px-3 py-1 text-xs font-medium shadow-sm translate-y-[10px]">
                {freelancer.experience_level}
              </span>
            )}

            <div className="flex flex-col sm:flex-row items-start gap-6">
              {freelancer.avatar_url ? (
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-purple-200">
                  <Image 
                    src={freelancer.avatar_url} 
                    alt={freelancer.display_name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {freelancer.display_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {freelancer.display_name}
                  </h1>
                  {freelancer.is_available && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Available
                    </Badge>
                  )}
                </div>
                <p className="text-primary font-medium mb-3">
                  {freelancer.title}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <StarRating rating={freelancer.rating} />
                  <span className="font-semibold">
                    {freelancer.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({freelancer.review_count} reviews)
                  </span>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {freelancer.bio}
                </p>

                {freelancer.description && (
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {freelancer.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  {freelancer.location && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {freelancer.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    {freelancer.completed_projects} projects
                  </span>
                  {freelancer.experience_level && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {freelancer.experience_level}
                    </span>
                  )}
                  {freelancer.languages.length > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      {freelancer.languages.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-6" />
            <div>
              <h3 className="font-semibold mb-3">Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {freelancer.skills.map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-bg text-white border-0 hover:opacity-90 rounded-xl">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact {freelancer.display_name.split(" ")[0]}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Contact {freelancer.display_name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Subject</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        value={contactForm.subject_type}
                        onChange={(e) => setContactForm({ ...contactForm, subject_type: e.target.value })}
                      >
                        <option value="hire">Hire Freelancer</option>
                        <option value="info">Request Information</option>
                        <option value="project">Discuss Project</option>
                        <option value="custom">Other (Custom)</option>
                      </select>
                    </div>
                    {contactForm.subject_type === 'custom' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Custom Subject</label>
                        <Input
                          placeholder="Enter your subject"
                          value={contactForm.custom_subject}
                          onChange={(e) => setContactForm({ ...contactForm, custom_subject: e.target.value })}
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Message</label>
                      <Textarea
                        placeholder="Tell them about your project..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gradient-bg text-white border-0"
                      disabled={contactSubmitting}
                    >
                      {contactSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Reviews ({reviews.length})
            </h2>

            <div className="glass-card rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-1">Leave a Review</h3>
              {userReview ? (
                <div className="py-2">
                  <p className="text-muted-foreground mb-2">You have already reviewed this freelancer.</p>
                  <StarRating rating={userReview.rating} size="sm" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <StarRating
                      rating={newRating}
                      interactive
                      onRatingChange={setNewRating}
                      size="lg"
                    />
                  </div>
                  <Textarea
                    placeholder="Share your experience working with this freelancer..."
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewComment(e.target.value)
                    }
                    rows={4}
                    className="mb-4"
                  />
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting || !newComment.trim()}
                    className="gradient-bg text-white border-0"
                  >
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </>
              )}
            </div>

            <div className="space-y-4">
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium mb-1">
                        {review.user?.full_name || review.user?.email || "Anonymous User"}
                      </p>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </motion.div>
              ))}

              {reviews.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No reviews yet. Be the first to leave a review!
                </p>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}