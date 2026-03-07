"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Target, Lightbulb, Rocket, Users } from "lucide-react";

export function AboutSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <ScrollReveal direction="left">
            <Badge variant="secondary" className="mb-4">
              About Us
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Building the future of{" "}
              <span className="gradient-text">digital commerce</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Founded in 2022, NexusHub was born from a simple idea: make it
              effortless for businesses to find premium digital products and
              world-class freelance talent in one place. Our founder, Sarah
              Chen, experienced the frustration of juggling multiple platforms
              and decided to build something better.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Today, we&apos;re proud to serve over 10,000 users worldwide,
              connecting creative professionals with businesses that need their
              expertise. Our curated marketplace ensures quality, while our
              freelancer vetting process guarantees top-tier talent.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  icon: Target,
                  title: "Our Mission",
                  desc: "Democratize access to premium digital resources",
                },
                {
                  icon: Lightbulb,
                  title: "Innovation",
                  desc: "Constantly evolving with cutting-edge tech",
                },
                {
                  icon: Rocket,
                  title: "Growth",
                  desc: "Helping businesses scale faster",
                },
                {
                  icon: Users,
                  title: "Community",
                  desc: "Building a global creative community",
                },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  whileHover={{ y: -4 }}
                  className="p-4 rounded-xl glass-card"
                >
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>

          {/* Right Content - Founder Card */}
          <ScrollReveal direction="right">
            <div className="relative">
              <div className="absolute inset-0 gradient-bg rounded-3xl blur-3xl opacity-20" />
              <div className="relative glass-card rounded-3xl p-8 lg:p-12">
                <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-bold mb-6">
                  SC
                </div>
                <blockquote className="text-lg italic text-muted-foreground mb-6 leading-relaxed">
                  &ldquo;I built NexusHub because I believe every creator
                  deserves a platform that values quality, transparency, and
                  community. We&apos;re not just a marketplace — we&apos;re a
                  movement to empower digital creators worldwide.&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold text-lg">Sarah Chen</p>
                  <p className="text-muted-foreground">Founder & CEO, NexusHub</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}