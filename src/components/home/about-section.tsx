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
              The idea took shape in 2025, when we noticed that this sector
              remained unregulated. We therefore decided to establish Milit
              Company to ensure customers receive the best service easily and
              at reasonable prices.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Today, we connect businesses with premium digital products and
              world-class freelance talent. Our curated marketplace ensures
              quality, while our professional freelance services guarantee
              top-tier results for every project.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                {
                  icon: Target,
                  title: "Many Options",
                  desc: "Wide variety of digital products and freelance services for every need",
                },
                {
                  icon: Lightbulb,
                  title: "Reasonable Prices",
                  desc: "Competitive pricing that delivers value without compromising quality",
                },
                {
                  icon: Rocket,
                  title: "Professional Services",
                  desc: "Verified freelancers delivering top-tier work on every project",
                },
                {
                  icon: Users,
                  title: "Community",
                  desc: "Information updates automatically when users change or new content is added",
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

            <div className="flex items-center gap-3 p-4 rounded-xl glass-card">
              <span className="text-sm font-medium text-muted-foreground">
                Contact us:
              </span>
              <a
                href="tel:+21628481862"
                className="text-sm font-bold text-primary hover:text-cyan-600 transition-colors"
              >
                +216 28 481 862
              </a>
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
                  &ldquo;I built Frilansiha Company because I believe every creator
                  deserves a platform that values quality, transparency, and
                  community. We&apos;re not just a marketplace — we&apos;re a
                  movement to empower digital creators worldwide.&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold text-lg">Yassin zamzem</p>
                  <p className="text-muted-foreground">Founder & CEO, Frilansiha Company</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}