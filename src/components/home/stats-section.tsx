"use client";

import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Package, Star } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: 10500,
    suffix: "+",
    label: "Active Users",
    description: "Creators and businesses worldwide",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Package,
    value: 500,
    suffix: "+",
    label: "Digital Products",
    description: "Curated premium resources",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: Star,
    value: 4200,
    suffix: "+",
    label: "5-Star Reviews",
    description: "From satisfied customers",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: TrendingUp,
    value: 2800000,
    prefix: "$",
    label: "Revenue Generated",
    description: "For our freelancers",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export function StatsSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Our Impact
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Numbers that <span className="gradient-text">speak volumes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our growing community of creators and businesses trust NexusHub to
            power their digital journey.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.15}>
              <div className="glass-card rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-300">
                <div
                  className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center mx-auto mb-4`}
                >
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div className="text-3xl sm:text-4xl font-bold mb-2">
                  <AnimatedCounter
                    target={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </div>
                <p className="font-semibold mb-1">{stat.label}</p>
                <p className="text-sm text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}