"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Quote,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { StarRating } from "@/components/ui/star-rating";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { ClientReview } from "@/types";

// Color palette for review cards - similar to Domain section
const reviewColorPalettes = [
  { bg: "bg-cyan-500", text: "text-cyan-500", gradient: "from-cyan-500 to-sky-500" },
  { bg: "bg-green-500", text: "text-green-500", gradient: "from-green-500 to-emerald-500" },
  { bg: "bg-purple-500", text: "text-purple-500", gradient: "from-purple-500 to-pink-500" },
  { bg: "bg-orange-500", text: "text-orange-500", gradient: "from-orange-500 to-amber-500" },
  { bg: "bg-blue-500", text: "text-blue-500", gradient: "from-blue-500 to-cyan-500" },
  { bg: "bg-rose-500", text: "text-rose-500", gradient: "from-rose-500 to-pink-500" },
];

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    reviewer_name: "",
    reviewer_title: "",
    reviewer_company: "",
    rating: 5,
    comment: "",
    is_anonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from("client_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setReviews(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Get latest reviews for slider (limit to 6 most recent)
  const sliderReviews = reviews.slice(0, 6);
  const allReviews = reviews;

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev >= sliderReviews.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev <= 0 ? sliderReviews.length - 1 : prev - 1
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("client_reviews").insert({
      ...formData,
      reviewer_name: formData.is_anonymous
        ? "Anonymous"
        : formData.reviewer_name,
    });

    if (!error) {
      toast({
        title: "Thank you!",
        description: "Your review has been submitted successfully.",
      });
      setFormData({
        reviewer_name: "",
        reviewer_title: "",
        reviewer_company: "",
        rating: 5,
        comment: "",
        is_anonymous: false,
      });
      fetchReviews();
    } else {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="relative pb-16">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
               Clients
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              What Our Clients{" "}
              <span className="gradient-text">Say About Us</span>
            </h1>
            {reviews.length > 0 ? (
              <p className="text-lg text-[#525252] dark:text-gray-400 max-w-2xl mx-auto">
                Hear directly from our clients about their experiences working with
                us and how we&apos;ve helped them achieve their goals.
              </p>
            ) : (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                No testimonials available.
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>

      {sliderReviews.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="relative max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="glass-card rounded-3xl p-8 sm:p-12 text-center"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${reviewColorPalettes[currentIndex % reviewColorPalettes.length].gradient} flex items-center justify-center mx-auto mb-6`}>
                  <Quote className="w-7 h-7 text-white" />
                </div>

                <p className="text-xl sm:text-2xl leading-relaxed mb-8 text-balance">
                  &ldquo;{sliderReviews[currentIndex]?.comment}&rdquo;
                </p>

                <div className="flex justify-center mb-4">
                  <StarRating
                    rating={sliderReviews[currentIndex]?.rating || 5}
                    size="lg"
                  />
                </div>

                <div>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${reviewColorPalettes[currentIndex % reviewColorPalettes.length].gradient} flex items-center justify-center text-white text-xl font-bold mx-auto mb-3`}>
                    {sliderReviews[currentIndex]?.reviewer_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </div>
                  <p className="font-semibold text-lg">
                    {sliderReviews[currentIndex]?.reviewer_name}
                  </p>
                  {sliderReviews[currentIndex]?.reviewer_title && (
                    <p className="text-muted-foreground">
                      {sliderReviews[currentIndex]?.reviewer_title}
                      {sliderReviews[currentIndex]?.reviewer_company &&
                        ` at ${sliderReviews[currentIndex]?.reviewer_company}`}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex gap-2">
                {sliderReviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentIndex
                        ? "bg-primary w-8"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                className="rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <ScrollReveal className="mb-8">
          <h2 className="text-2xl font-bold">All Reviews</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allReviews.map((review, index) => (
            <ScrollReveal key={review.id} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                className="glass-card rounded-2xl p-6 h-full flex flex-col"
              >
                <div className="mb-3">
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-4">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${reviewColorPalettes[index % reviewColorPalettes.length].gradient} flex items-center justify-center text-white text-sm font-bold`}>
                    {review.is_anonymous
                      ? "?"
                      : review.reviewer_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {review.is_anonymous ? "Anonymous" : review.reviewer_name}
                    </p>
                    {review.reviewer_company && (
                      <p className="text-xs text-muted-foreground">
                        {review.reviewer_company}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <div className="glass-card rounded-3xl p-8">
              <div className="text-center mb-8">
                <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Share Your Experience</h2>
                <p className="text-muted-foreground">
                  We&apos;d love to hear about your experience with Milit Company.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={formData.is_anonymous}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, is_anonymous: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label htmlFor="anonymous" className="text-sm text-muted-foreground">
                    Submit anonymously
                  </label>
                </div>

                {!formData.is_anonymous && (
                  <>
                    <Input
                      placeholder="Your name"
                      value={formData.reviewer_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, reviewer_name: e.target.value })
                      }
                      required={!formData.is_anonymous}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Your title (optional)"
                        value={formData.reviewer_title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({ ...formData, reviewer_title: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Company (optional)"
                        value={formData.reviewer_company}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({ ...formData, reviewer_company: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Rating</label>
                  <StarRating
                    rating={formData.rating}
                    interactive
                    onRatingChange={(rating: number) =>
                      setFormData({ ...formData, rating })
                    }
                    size="lg"
                  />
                </div>

                <Textarea
                  placeholder="Tell us about your experience..."
                  value={formData.comment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, comment: e.target.value })
                  }
                  rows={5}
                  required
                />

                <Button
                  type="submit"
                  className="w-full gradient-bg text-white border-0 hover:opacity-90 h-12 rounded-xl"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}