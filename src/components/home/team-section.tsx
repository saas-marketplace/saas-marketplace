"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Twitter, Github } from "lucide-react";

const team = [
  {
    name: "Sarah Chen",
    role: "Founder & CEO",
    initials: "SC",
    gradient: "from-purple-500 to-pink-500",
    bio: "Visionary leader with 15+ years in tech",
  },
  {
    name: "Marcus Webb",
    role: "CTO",
    initials: "MW",
    gradient: "from-blue-500 to-cyan-500",
    bio: "Engineering genius behind our platform",
  },
  {
    name: "Priya Sharma",
    role: "Head of Design",
    initials: "PS",
    gradient: "from-pink-500 to-orange-500",
    bio: "Creating beautiful experiences daily",
  },
  {
    name: "Alex Rivera",
    role: "Head of Marketing",
    initials: "AR",
    gradient: "from-green-500 to-emerald-500",
    bio: "Growth expert and brand strategist",
  },
  {
    name: "David Kim",
    role: "Head of Product",
    initials: "DK",
    gradient: "from-yellow-500 to-red-500",
    bio: "Product visionary and user advocate",
  },
  {
    name: "Emily Zhang",
    role: "Lead Developer",
    initials: "EZ",
    gradient: "from-indigo-500 to-purple-500",
    bio: "Full-stack wizard and code artist",
  },
];

export function TeamSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Our Team
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Meet the <span className="gradient-text">dreamers</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A passionate team of creators, engineers, and entrepreneurs
            dedicated to building the future of digital commerce.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member, index) => (
            <ScrollReveal key={member.name} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -8 }}
                className="glass-card rounded-2xl p-6 text-center group cursor-pointer"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4`}
                >
                  {member.initials}
                </motion.div>
                <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                <p className="text-sm text-primary font-medium mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground mb-4">{member.bio}</p>
                <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {[Twitter, Linkedin, Github].map((Icon, i) => (
                    <button
                      key={i}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}