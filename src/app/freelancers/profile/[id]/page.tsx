"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Briefcase,
  DollarSign,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { StarRating } from "@/components/ui/star-rating";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import type { Freelancer, FreelancerReview } from "@/types";

export default function FreelancerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [reviews, setReviews] = useState<FreelancerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchFreelancer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function fetchFreelancer() {
    setLoading(true);
    const { data: freelancerData } = await supabase
      .from("freelancers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (freelancerData) {
      setFreelancer(freelancerData);

      const { data: reviewData } = await supabase
        .from("freelancer_reviews")
        .select("*")
        .eq("freelancer_id", freelancerData.id)
        .order("created_at", { ascending: false });

      if (reviewData) setReviews(reviewData);
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

    setSubmitting(true);
    const { error } = await supabase.from("freelancer_reviews").insert({
      freelancer_id: freelancer!.id,
      user_id: user.id,
      rating: newRating,
      comment: newComment,
      reviewer_name: user.email,
    });

    if (!error) {
      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback.",
      });
      setNewComment("");
      setNewRating(5);
      fetchFreelancer();
    }
    setSubmitting(false);
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
          <div className="glass-card rounded-3xl p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {freelancer.display_name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </div>

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
                  {freelancer.hourly_rate && (
                    <span className="flex items-center gap-1 font-semibold">
                      <DollarSign className="w-4 h-4 text-primary" />
                      {freelancer.hourly_rate}/hr
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
              <Button className="gradient-bg text-white border-0 hover:opacity-90 rounded-xl">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact {freelancer.display_name.split(" ")[0]}
              </Button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Reviews ({reviews.length})
            </h2>

            <div className="glass-card rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-4">Leave a Review</h3>
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
                      <p className="font-medium">
                        {review.is_anonymous
                          ? "Anonymous"
                          : review.reviewer_name || "User"}
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